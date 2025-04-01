$(document).ready(function() {
    let httpxTable = null;
    let gauTable = null;
    let checkResultsInterval = null;

    // Initialize DataTables
    function initializeTables() {
        if (httpxTable) {
            httpxTable.destroy();
        }
        if (gauTable) {
            gauTable.destroy();
        }

        httpxTable = $('#httpxTable').DataTable({
            pageLength: 25,
            order: [[0, 'asc']],
            language: {
                search: "Search URLs:",
                lengthMenu: "Show _MENU_ entries per page"
            }
        });

        gauTable = $('#gauTable').DataTable({
            pageLength: 25,
            order: [[0, 'asc']],
            language: {
                search: "Search URLs:",
                lengthMenu: "Show _MENU_ entries per page"
            }
        });
    }

    // Handle form submission
    $('#scanForm').on('submit', function(e) {
        e.preventDefault();
        
        const domain = $('#domain').val();
        if (!domain) {
            alert('Please enter a domain');
            return;
        }

        // Show loading state
        $('#loading').removeClass('d-none');
        $('#results').addClass('d-none');
        
        // Clear previous results
        $('#httpxTable tbody').empty();
        $('#gauTable tbody').empty();

        // Start the scan
        $.ajax({
            url: '/scan',
            method: 'POST',
            data: { domain: domain },
            success: function(response) {
                if (response.error) {
                    alert('Error: ' + response.error);
                    $('#loading').addClass('d-none');
                    return;
                }

                // Start checking for results
                if (checkResultsInterval) {
                    clearInterval(checkResultsInterval);
                }

                checkResultsInterval = setInterval(checkResults, 2000);
            },
            error: function() {
                alert('Error starting scan');
                $('#loading').addClass('d-none');
            }
        });
    });

    // Check for results
    function checkResults() {
        $.ajax({
            url: '/results',
            method: 'GET',
            success: function(response) {
                if (response.error) {
                    alert('Error: ' + response.error);
                    $('#loading').addClass('d-none');
                    clearInterval(checkResultsInterval);
                    return;
                }

                if (response.status === 'pending') {
                    return;
                }

                // Clear interval as we have results
                clearInterval(checkResultsInterval);

                // Hide loading
                $('#loading').addClass('d-none');

                // Process HTTPX results
                if (response.httpx) {
                    response.httpx.forEach(function(result) {
                        const parts = result.split(' [');
                        const url = parts[0];
                        const statusCode = parts[1] ? parts[1].replace(']', '') : '';
                        const technology = parts[2] ? parts[2].replace(']', '') : '';

                        $('#httpxTable tbody').append(`
                            <tr>
                                <td><a href="${url}" target="_blank">${url}</a></td>
                                <td>${statusCode}</td>
                                <td>${technology}</td>
                            </tr>
                        `);
                    });
                }

                // Process GAU results
                if (response.gau) {
                    response.gau.forEach(function(url) {
                        $('#gauTable tbody').append(`
                            <tr>
                                <td><a href="${url}" target="_blank">${url}</a></td>
                            </tr>
                        `);
                    });
                }

                // Show results and initialize tables
                $('#results').removeClass('d-none');
                initializeTables();
            },
            error: function() {
                alert('Error checking results');
                $('#loading').addClass('d-none');
                clearInterval(checkResultsInterval);
            }
        });
    }
}); 
$(document).ready(function() {
    let subdomainsTable = null;
    let httpxTable = null;
    let gauTable = null;
    let checkResultsInterval = null;
    let currentDomain = null;

    // Initialize DataTables
    function initializeTables() {
        if (subdomainsTable) {
            subdomainsTable.destroy();
        }
        if (httpxTable) {
            httpxTable.destroy();
        }
        if (gauTable) {
            gauTable.destroy();
        }

        subdomainsTable = $('#subdomainsTable').DataTable({
            pageLength: 25,
            order: [[0, 'asc']],
            language: {
                search: "Search domains:",
                lengthMenu: "Show _MENU_ entries per page"
            }
        });

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

        currentDomain = domain;
        
        // Show loading state
        $('#loading').removeClass('d-none');
        $('#loadingText').text('Finding subdomains...');
        $('#results').addClass('d-none');
        
        // Clear previous results
        $('#subdomainsTable tbody').empty();
        $('#httpxTable tbody').empty();
        $('#gauTable tbody').empty();

        // Start the subdomain scan
        $.ajax({
            url: '/scan',
            method: 'POST',
            data: { 
                domain: domain,
                stage: 'subdomains'
            },
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

    // Handle httpx scan button click
    $('#scanHttpx').on('click', function() {
        if (!currentDomain) return;

        $('#loading').removeClass('d-none');
        $('#loadingText').text('Scanning live hosts...');

        $.ajax({
            url: '/scan',
            method: 'POST',
            data: { 
                domain: currentDomain,
                stage: 'httpx'
            },
            success: function(response) {
                if (response.error) {
                    alert('Error: ' + response.error);
                    $('#loading').addClass('d-none');
                    return;
                }

                if (checkResultsInterval) {
                    clearInterval(checkResultsInterval);
                }

                checkResultsInterval = setInterval(checkResults, 2000);
            },
            error: function() {
                alert('Error starting httpx scan');
                $('#loading').addClass('d-none');
            }
        });
    });

    // Function to scan individual domain with gau
    function scanGau(domain) {
        $('#loading').removeClass('d-none');
        $('#loadingText').text('Finding historical URLs...');

        $.ajax({
            url: '/scan',
            method: 'POST',
            data: { 
                domain: domain,
                stage: 'gau'
            },
            success: function(response) {
                if (response.error) {
                    alert('Error: ' + response.error);
                    $('#loading').addClass('d-none');
                    return;
                }

                if (checkResultsInterval) {
                    clearInterval(checkResultsInterval);
                }

                checkResultsInterval = setInterval(checkResults, 2000);
            },
            error: function() {
                alert('Error starting gau scan');
                $('#loading').addClass('d-none');
            }
        });
    }

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

                // Process results based on stage
                switch(response.stage) {
                    case 'subdomains':
                        response.domains.forEach(function(domain) {
                            $('#subdomainsTable tbody').append(`
                                <tr>
                                    <td>${domain}</td>
                                </tr>
                            `);
                        });
                        $('#results').removeClass('d-none');
                        initializeTables();
                        break;

                    case 'httpx':
                        response.results.forEach(function(result) {
                            const parts = result.split(' [');
                            const url = parts[0];
                            const statusCode = parts[1] ? parts[1].replace(']', '') : '';
                            const technology = parts[2] ? parts[2].replace(']', '') : '';

                            $('#httpxTable tbody').append(`
                                <tr>
                                    <td><a href="${url}" target="_blank">${url}</a></td>
                                    <td>${statusCode}</td>
                                    <td>${technology}</td>
                                    <td>
                                        <button class="btn btn-sm btn-info scan-gau" data-domain="${url}">
                                            Find Historical URLs
                                        </button>
                                    </td>
                                </tr>
                            `);
                        });
                        initializeTables();
                        break;

                    case 'gau':
                        response.results.forEach(function(url) {
                            $('#gauTable tbody').append(`
                                <tr>
                                    <td><a href="${url}" target="_blank">${url}</a></td>
                                </tr>
                            `);
                        });
                        initializeTables();
                        break;
                }
            },
            error: function() {
                alert('Error checking results');
                $('#loading').addClass('d-none');
                clearInterval(checkResultsInterval);
            }
        });
    }

    // Handle gau scan button clicks
    $(document).on('click', '.scan-gau', function() {
        const domain = $(this).data('domain');
        scanGau(domain);
    });
}); 
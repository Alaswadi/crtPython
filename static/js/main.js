$(document).ready(function() {
    let subdomainsTable = null;
    let httpxTable = null;
    let gauTable = null;
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
                checkSubdomainResults(domain);
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

                // Start checking for results
                checkHttpxResults(currentDomain);
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

                // Start checking for results
                checkGauResults(domain);
            },
            error: function() {
                alert('Error starting gau scan');
                $('#loading').addClass('d-none');
            }
        });
    }

    // Check for subdomain results
    function checkSubdomainResults(domain) {
        $.ajax({
            url: '/results',
            method: 'GET',
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

                if (response.status === 'success') {
                    $('#loading').addClass('d-none');
                    $('#results').removeClass('d-none');
                    
                    response.domains.forEach(function(domain) {
                        $('#subdomainsTable tbody').append(`
                            <tr>
                                <td>${domain}</td>
                            </tr>
                        `);
                    });
                    
                    initializeTables();
                } else {
                    setTimeout(() => checkSubdomainResults(domain), 2000);
                }
            },
            error: function() {
                alert('Error checking results');
                $('#loading').addClass('d-none');
            }
        });
    }

    // Check for httpx results
    function checkHttpxResults(domain) {
        $.ajax({
            url: '/results',
            method: 'GET',
            data: {
                domain: domain,
                stage: 'httpx'
            },
            success: function(response) {
                if (response.error) {
                    alert('Error: ' + response.error);
                    $('#loading').addClass('d-none');
                    return;
                }

                if (response.status === 'success') {
                    $('#loading').addClass('d-none');
                    
                    // Clear existing results
                    $('#httpxTable tbody').empty();
                    
                    response.results.forEach(function(result) {
                        // Split the result into parts
                        const matches = result.match(/^(.*?)\s*\[(.*?)\]\s*\[(.*?)\]$/);
                        if (matches) {
                            const url = matches[1].trim();
                            const statusCode = matches[2].trim();
                            const technology = matches[3].trim();

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
                        }
                    });
                    
                    initializeTables();
                } else {
                    setTimeout(() => checkHttpxResults(domain), 2000);
                }
            },
            error: function() {
                alert('Error checking results');
                $('#loading').addClass('d-none');
            }
        });
    }

    // Check for gau results
    function checkGauResults(domain) {
        $.ajax({
            url: '/results',
            method: 'GET',
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

                if (response.status === 'success') {
                    $('#loading').addClass('d-none');
                    
                    // Clear existing results
                    $('#gauTable tbody').empty();
                    
                    response.results.forEach(function(url) {
                        $('#gauTable tbody').append(`
                            <tr>
                                <td><a href="${url}" target="_blank">${url}</a></td>
                            </tr>
                        `);
                    });
                    
                    initializeTables();
                } else {
                    setTimeout(() => checkGauResults(domain), 2000);
                }
            },
            error: function() {
                alert('Error checking results');
                $('#loading').addClass('d-none');
            }
        });
    }

    // Handle gau scan button clicks
    $(document).on('click', '.scan-gau', function() {
        const domain = $(this).data('domain');
        scanGau(domain);
    });
}); 
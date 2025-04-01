import sqlite3
from datetime import datetime

def init_db():
    conn = sqlite3.connect('scan_results.db')
    c = conn.cursor()
    
    # Create tables for each stage
    c.execute('''
        CREATE TABLE IF NOT EXISTS subdomains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            subdomain TEXT NOT NULL,
            scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS live_hosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            url TEXT NOT NULL,
            status_code TEXT,
            technology TEXT,
            scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS historical_urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            url TEXT NOT NULL,
            scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def save_subdomains(domain, subdomains):
    conn = sqlite3.connect('scan_results.db')
    c = conn.cursor()
    
    for subdomain in subdomains:
        c.execute('INSERT INTO subdomains (domain, subdomain) VALUES (?, ?)',
                 (domain, subdomain))
    
    conn.commit()
    conn.close()

def save_live_hosts(domain, results):
    conn = sqlite3.connect('scan_results.db')
    c = conn.cursor()
    
    for result in results:
        # Parse the result string
        matches = result.split('[')
        if len(matches) >= 3:
            url = matches[0].strip()
            status_code = matches[1].replace(']', '').strip()
            technology = matches[2].replace(']', '').strip()
        else:
            url = result.strip()
            status_code = 'N/A'
            technology = 'N/A'
            
        c.execute('''
            INSERT INTO live_hosts (domain, url, status_code, technology)
            VALUES (?, ?, ?, ?)
        ''', (domain, url, status_code, technology))
    
    conn.commit()
    conn.close()

def save_historical_urls(domain, urls):
    conn = sqlite3.connect('scan_results.db')
    c = conn.cursor()
    
    for url in urls:
        c.execute('INSERT INTO historical_urls (domain, url) VALUES (?, ?)',
                 (domain, url))
    
    conn.commit()
    conn.close()

def get_subdomains(domain):
    conn = sqlite3.connect('scan_results.db')
    c = conn.cursor()
    
    c.execute('SELECT subdomain FROM subdomains WHERE domain = ?', (domain,))
    results = [row[0] for row in c.fetchall()]
    
    conn.close()
    return results

def get_live_hosts(domain):
    conn = sqlite3.connect('scan_results.db')
    c = conn.cursor()
    
    c.execute('''
        SELECT url, status_code, technology 
        FROM live_hosts 
        WHERE domain = ?
    ''', (domain,))
    results = c.fetchall()
    
    conn.close()
    return results

def get_historical_urls(domain):
    conn = sqlite3.connect('scan_results.db')
    c = conn.cursor()
    
    c.execute('SELECT url FROM historical_urls WHERE domain = ?', (domain,))
    results = [row[0] for row in c.fetchall()]
    
    conn.close()
    return results 
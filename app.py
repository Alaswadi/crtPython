import os
import json
import subprocess
import requests
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import threading
import queue
import re

app = Flask(__name__)
results_queue = queue.Queue()

def clean_output_files(domain):
    """Clean up existing output files"""
    files_to_remove = [
        f'output/subfinder_{domain}.txt',
        f'output/crtsh_{domain}.txt',
        f'output/domain_{domain}.txt',
        f'output/httpx_domain_{domain}.txt',
        f'output/httpx_org_{domain}.txt',
        f'output/gau_{domain}.txt'
    ]
    for file in files_to_remove:
        if os.path.exists(file):
            os.remove(file)

def get_crtsh_data(domain):
    """Get certificate data from crt.sh"""
    url = f"https://crt.sh?q=%.{domain}&output=json"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        subdomains = set()
        for cert in data:
            if 'common_name' in cert:
                subdomains.add(cert['common_name'])
            if 'name_value' in cert:
                subdomains.add(cert['name_value'])
        return list(subdomains)
    return []

def discover_subdomains(domain):
    """Stage 1: Discover subdomains"""
    try:
        clean_output_files(domain)
        
        # Run subfinder
        subfinder_cmd = f"subfinder -d {domain} -o output/subfinder_{domain}.txt -silent"
        subprocess.run(subfinder_cmd, shell=True)
        
        # Get crt.sh data
        crtsh_domains = get_crtsh_data(domain)
        with open(f'output/crtsh_{domain}.txt', 'w') as f:
            f.write('\n'.join(crtsh_domains))
        
        # Combine results
        with open(f'output/subfinder_{domain}.txt', 'r') as f:
            subfinder_domains = f.read().splitlines()
        
        all_domains = list(set(subfinder_domains + crtsh_domains))
        with open(f'output/domain_{domain}.txt', 'w') as f:
            f.write('\n'.join(all_domains))
        
        results_queue.put({
            'stage': 'subdomains',
            'domains': all_domains,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        results_queue.put({'error': str(e)})

def strip_ansi_codes(text):
    """Remove ANSI color codes from text"""
    ansi_escape = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]')
    return ansi_escape.sub('', text)

def scan_live_hosts(domain):
    """Stage 2: Scan live hosts with httpx"""
    try:
        # Run httpx
        httpx_cmd = f"httpx -l output/domain_{domain}.txt -silent -tech-detect -status-code -o output/httpx_domain_{domain}.txt"
        subprocess.run(httpx_cmd, shell=True)
        
        # Read results and strip ANSI codes
        with open(f'output/httpx_domain_{domain}.txt', 'r') as f:
            httpx_results = [strip_ansi_codes(line) for line in f.read().splitlines()]
        
        results_queue.put({
            'stage': 'httpx',
            'results': httpx_results,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        results_queue.put({'error': str(e)})

def get_historical_urls(domain):
    """Stage 3: Get historical URLs with gau"""
    try:
        # Run gau
        gau_cmd = f"gau --threads 5 {domain} > output/gau_{domain}.txt"
        subprocess.run(gau_cmd, shell=True)
        
        # Read results
        with open(f'output/gau_{domain}.txt', 'r') as f:
            gau_results = f.read().splitlines()
        
        results_queue.put({
            'stage': 'gau',
            'domain': domain,
            'results': gau_results,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        results_queue.put({'error': str(e)})

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scan', methods=['POST'])
def scan():
    domain = request.form.get('domain')
    stage = request.form.get('stage')
    
    if not domain:
        return jsonify({'error': 'Domain is required'})
    
    # Start appropriate stage in background
    if stage == 'subdomains':
        thread = threading.Thread(target=discover_subdomains, args=(domain,))
    elif stage == 'httpx':
        thread = threading.Thread(target=scan_live_hosts, args=(domain,))
    elif stage == 'gau':
        thread = threading.Thread(target=get_historical_urls, args=(domain,))
    else:
        return jsonify({'error': 'Invalid stage'})
    
    thread.start()
    return jsonify({'message': f'{stage} scan started', 'domain': domain})

@app.route('/results')
def get_results():
    try:
        results = results_queue.get_nowait()
        return jsonify(results)
    except queue.Empty:
        return jsonify({'status': 'pending'})

if __name__ == '__main__':
    os.makedirs('output', exist_ok=True)
    app.run(host='0.0.0.0', port=9000, debug=False) 
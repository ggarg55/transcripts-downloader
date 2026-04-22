// Classroom Pro v2.0 - Core Engine
// Developed by ggarg

const UI = {
    btnDownload: document.getElementById('downloadAll'),
    console: document.getElementById('console'),
    log: document.getElementById('statusLog'),
    status: document.getElementById('currentStatus'),
    percent: document.getElementById('percentDone'),
    progress: document.getElementById('progressBar'),
    
    addLog(msg, type = 'info') {
        const li = document.createElement('li');
        li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        if (type === 'error') li.style.color = '#ff4444';
        this.log.appendChild(li);
        this.log.scrollTop = this.log.scrollHeight;
    },
    
    updateProgress(current, total, statusMsg) {
        const p = Math.round((current / total) * 100);
        this.progress.style.width = `${p}%`;
        this.percent.textContent = `${p}%`;
        if (statusMsg) this.status.textContent = statusMsg;
    },

    showConsole() {
        this.console.style.display = 'block';
    }
};

UI.btnDownload.addEventListener('click', async () => {
    const config = {
        transcripts: document.getElementById('checkTranscripts').checked,
        ppts: document.getElementById('checkPPTs').checked,
        lectures: document.getElementById('checkLectures').checked,
        scripts: document.getElementById('checkScripts').checked
    };

    UI.showConsole();
    UI.btnDownload.disabled = true;
    UI.addLog('Starting scan of classroom page...');
    
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // 1. Scan the page
        const results = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            function: scanPage,
            args: [config]
        });

        const items = results[0].result;
        UI.addLog(`Scan complete. Found ${items.length} items.`);

        if (items.length === 0) {
            UI.addLog('No items found matching criteria.', 'error');
            UI.btnDownload.disabled = false;
            return;
        }

        // 2. Process and Zip
        await processAndZip(items);

    } catch (err) {
        UI.addLog(`Critical Error: ${err.message}`, 'error');
        console.error(err);
    } finally {
        UI.btnDownload.disabled = false;
        UI.status.textContent = 'Ready';
    }
});

/**
 * Script injected into the Classroom page to find materials
 */
function scanPage(config) {
    const items = [];
    const links = Array.from(document.querySelectorAll('a'));
    const isUdemy = window.location.hostname.includes('udemy.com');
    
    // 1. TRANSCRIPT SCRAPING
    if (config.transcripts) {
        if (isUdemy) {
            // Udemy Selective Scraper
            const cues = Array.from(document.querySelectorAll('[data-purpose="transcript-cue-text"]'));
            if (cues.length > 0) {
                const text = cues.map(c => c.innerText.trim()).join('\n');
                items.push({
                    type: 'transcript',
                    content: text,
                    label: 'udemy_transcript.txt'
                });
            }
        } else {
            // Classroom Heuristic Scraper
            let transcriptText = "";
            document.querySelectorAll('div').forEach(el => {
                if (el.innerText.length > 40 && el.children.length === 0) {
                    transcriptText += el.innerText.trim() + "\n\n";
                }
            });
            if (transcriptText.length > 100) {
                items.push({
                    type: 'transcript',
                    content: transcriptText,
                    label: 'classroom_transcript.txt'
                });
            }
        }
    }

    // 2. RESOURCE & LECTURE SCRAPING
    if (isUdemy) {
        // Udemy Resource Strategy
        document.querySelectorAll('[data-purpose*="resource"]').forEach(el => {
            const href = el.href || el.getAttribute('href');
            if (href) {
                const label = (el.innerText || "udemy_resource").trim();
                const type = (href.match(/\.(py|js|java|cpp|c|sh|ipynb)$/i)) ? 'script' : 'lecture';
                if ((type === 'script' && config.scripts) || (type === 'lecture' && config.lectures)) {
                    items.push({ type, url: href, label });
                }
            }
        });
    }

    // Classroom/Generic Link Strategy
    links.forEach(a => {
        const href = a.href.toLowerCase();
        const label = (a.ariaLabel || a.title || a.innerText || "unnamed").trim();
        const labelLow = label.toLowerCase();

        // PPTs - Broadened to include extension in label and card text
        if (config.ppts) {
            if (href.includes('.pptx') || href.includes('docs.google.com/presentation') || 
                labelLow.includes('.pptx') || labelLow.includes('.ppt') ||
                labelLow.includes('presentation') || labelLow.includes('slides') ||
                labelLow.includes('powerpoint')) {
                items.push({ type: 'ppt', url: a.href, label: label });
                return;
            }
        }

        // Lectures (Videos/YouTube)
        if (config.lectures) {
            if (href.includes('.mp4') || href.includes('.mkv') || href.includes('.avi') || 
                href.includes('youtube.com') || href.includes('youtu.be') || 
                labelLow.includes('video') || labelLow.includes('lecture') || 
                labelLow.includes('recording') || labelLow.includes('mp4')) {
                items.push({ type: 'lecture', url: a.href, label: label });
                return;
            }
        }

        // Scripts/Code - Broadened
        if (config.scripts) {
            const codeExts = ['.py', '.java', '.cpp', '.c', '.js', '.sh', '.ipynb', '.php', '.go', '.rs'];
            if (codeExts.some(ext => href.endsWith(ext) || labelLow.includes(ext)) || 
                labelLow.includes('script') || labelLow.includes('code') || 
                href.includes('colab.research') || labelLow.includes('github')) {
                items.push({ type: 'script', url: a.href, label: label });
            }
        }
    });

    // Deduplicate by URL/Label/Content - More unique key
    const seen = new Set();
    return items.filter(item => {
        const key = (item.url || item.content.substring(0, 200)) + (item.label || "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Transforms Google Drive/Docs/Slides URLs into direct download/export links
 */
function transformGoogleUrl(url, type) {
    if (!url) return url;
    
    // Extract account index if present (e.g. /u/0/ or /u/1/)
    const authMatch = url.match(/\/u\/([0-9]+)\//);
    const authPart = authMatch ? `/u/${authMatch[1]}` : "";
    
    // Extract ID (usually follows /d/)
    const idMatch = url.match(/\/d\/([^\/?#]+)/);
    if (!idMatch) return url;
    const id = idMatch[1];

    // 1. Google Drive Files - Using docs.google.com/uc for better fetch/CORS compatibility
    if (url.includes('drive.google.com/file')) {
        return `https://docs.google.com${authPart}/uc?export=download&id=${id}`;
    }

    // 2. Google Slides
    if (url.includes('docs.google.com/presentation')) {
        return `https://docs.google.com${authPart}/presentation/d/${id}/export/pptx`;
    }

    // 3. Google Docs
    if (url.includes('docs.google.com/document')) {
        return `https://docs.google.com${authPart}/document/d/${id}/export?format=docx`;
    }

    // 4. Google Sheets
    if (url.includes('docs.google.com/spreadsheets')) {
        return `https://docs.google.com${authPart}/spreadsheets/d/${id}/export?format=xlsx`;
    }

    return url;
}

/**
 * Batches items into a ZIP using JSZip
 */
async function processAndZip(items) {
    const zip = new JSZip();
    const ytMeta = [];
    let processed = 0;

    UI.addLog('Initializing ZIP archive...');

    for (const item of items) {
        processed++;
        UI.updateProgress(processed, items.length, `Processing ${processed}/${items.length}`);

        try {
            if (item.type === 'transcript') {
                zip.file(item.label, item.content);
                UI.addLog(`Added transcript: ${item.label}`);
            } 
            else if (item.type === 'lecture' && (item.url.includes('youtube.com') || item.url.includes('youtu.be'))) {
                ytMeta.push(`- [${item.label}](${item.url})`);
                UI.addLog(`Logged YouTube lecture: ${item.label}`);
            }
            else {
                let downloadUrl = transformGoogleUrl(item.url, item.type);
                let fileName = item.label;

                // Ensure extensions match for Google exports
                if (downloadUrl.includes('/export/pptx') && !fileName.toLowerCase().endsWith('.pptx')) fileName += '.pptx';
                if (downloadUrl.includes('format=docx') && !fileName.toLowerCase().endsWith('.docx')) fileName += '.docx';
                if (downloadUrl.includes('format=xlsx') && !fileName.toLowerCase().endsWith('.xlsx')) fileName += '.xlsx';

                // Attempt to fetch binary content with credentials (cookies)
                UI.addLog(`Fetching: ${fileName}...`);
                const response = await fetch(downloadUrl, { credentials: 'include' });
                
                if (!response.ok) {
                    // Fallback to original URL if transformation failed (e.g. access denied on UC link)
                    if (downloadUrl !== item.url) {
                        UI.addLog(`Retry primary: ${fileName}...`, 'info');
                        const retry = await fetch(item.url, { credentials: 'include' });
                        if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
                        const blob = await retry.blob();
                        const safeName = fileName.replace(/[<>:"/\\|?*]/g, '_');
                        zip.file(safeName, blob);
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } else {
                    const blob = await response.blob();
                    // Add to zip (clean up fileName to be safe)
                    const safeName = fileName.replace(/[<>:"/\\|?*]/g, '_');
                    zip.file(safeName, blob);
                    UI.addLog(`Packed: ${safeName}`);
                }
            }
        } catch (err) {
            UI.addLog(`Error [${item.label}]: ${err.message}`, 'error');
            console.error(`Download failed for ${item.label}:`, err);
        }
    }

    // Add YouTube Metadata if any
    if (ytMeta.length > 0) {
        const content = "# YouTube Lectures Found\n\n" + ytMeta.join('\n');
        zip.file('youtube_lectures.md', content);
        UI.addLog('Generated youtube_lectures.md');
    }

    // Finalize ZIP
    UI.status.textContent = 'Generating final archive...';
    UI.addLog('Compressing... this may take a moment.');
    
    const zipBlob = await zip.generateAsync({type: 'blob'});
    const url = URL.createObjectURL(zipBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Classroom_Archive_${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    
    UI.addLog('Download started! Dashboard reset.');
    UI.updateProgress(items.length, items.length, 'Complete');
}
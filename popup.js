document.getElementById("download").addEventListener("click", async () => {

    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function: getTranscript
    });

});

function getTranscript(){

    let text = "";

    // try to capture classroom comments/messages
    document.querySelectorAll("div").forEach(el=>{
        if(el.innerText.length > 30){
            text += el.innerText + "\n\n";
        }
    });

    const blob = new Blob([text], {type:"text/plain"});

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "classroom_transcript.txt";
    a.click();

}

function transformGoogleUrl(url) {
    if (!url) return url;
    
    const driveMatch = url.match(/\/file\/d\/([^\/?#]+)/);
    if (driveMatch) {
        return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    const slideMatch = url.match(/\/presentation\/d\/([^\/?#]+)/);
    if (slideMatch) {
        return `https://docs.google.com/presentation/d/${slideMatch[1]}/export/pptx`;
    }

    const docMatch = url.match(/\/document\/d\/([^\/?#]+)/);
    if (docMatch) {
        return `https://docs.google.com/document/d/${docMatch[1]}/export?format=docx`;
    }

    const sheetMatch = url.match(/\/spreadsheets\/d\/([^\/?#]+)/);
    if (sheetMatch) {
        return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=xlsx`;
    }

    return url;
}

const testUrls = [
    "https://drive.google.com/file/d/1QPefrkTlIcOqq_syqZhw4Opgjs2hrJjC/view?usp=classroom_web",
    "https://docs.google.com/presentation/d/1abcd1234/edit#slide=id.p",
    "https://docs.google.com/document/d/1doc_id_here/edit?tab=t.0",
    "https://docs.google.com/spreadsheets/d/1sheet_id/edit",
    "https://example.com/somefile.pptx"
];

testUrls.forEach(url => {
    console.log(`Original: ${url}`);
    console.log(`Transformed: ${transformGoogleUrl(url)}`);
    console.log('---');
});

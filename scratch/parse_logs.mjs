import fs from 'fs';

const fileContent = fs.readFileSync('C:/Users/kizug/.gemini/antigravity-ide/brain/ecf16b31-31f4-484c-be28-58b3dada1a48/.system_generated/steps/2122/output.txt', 'utf8');
const data = JSON.parse(fileContent);

const logs = data.result.result;
console.log('Total log entries:', logs.length);

const non2xxLogs = logs.filter(log => log.status_code >= 400);
console.log('Non-2xx log entries:', non2xxLogs.length);
non2xxLogs.forEach(log => {
    console.log(`- ${log.method} ${log.status_code} ${log.event_message || ''} @ ${new Date(log.timestamp / 1000).toISOString()}`);
});

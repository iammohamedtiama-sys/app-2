const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const image = value => /^data:image\/(png|jpeg|webp);base64,[a-z\d+/=\s]+$/i.test(value || '') ? value : '';
function ticketDocument(p) {
  const width = Number(p.paperWidth) === 58 ? 58 : 80;
  const logo = image(p.logoImage);
  const section = part => {
    const text = p[part];
    if (!text) return '';
    const qr = image(p[part+'QrImage']);
    return `<section><header>${logo?`<img class="logo" src="${logo}">`:''}<strong>${esc(p.company)}</strong><small>${esc(p.companyPhone)}<br>${esc(p.companyAddress)}</small></header><h2>${esc(part==='parcel'?'TALON COLIS':p.receiptTitle||'REÇU CLIENT')}</h2><div class="code">${esc(p.code)}</div><h3>${esc(p.route)}</h3><pre>${esc(text)}</pre>${qr?`<img class="qr" src="${qr}">`:''}<p>${esc(p[part+'Mention'])}</p></section>`;
  };
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${width}mm auto;margin:1.5mm}*{box-sizing:border-box}body{margin:0;color:#000;background:white;font:12px Arial}section{width:${width-3}mm;padding:1.5mm;break-after:page}section:last-child{break-after:auto}header{text-align:center}strong{display:block;font-size:18px}small{font-size:10px}.logo{width:16mm;height:16mm;object-fit:contain}h2,h3,p{text-align:center}h2{font-size:15px}.code{border:2px solid black;text-align:center;font:bold 21px monospace;padding:4px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px Arial;line-height:1.5}.qr{display:block;width:25mm;height:25mm;margin:4px auto}</style></head><body>${p.printPart==='parcel'?section('parcel'):p.printPart==='receipt'?section('receipt'):section('receipt')+section('parcel')}</body></html>`;
}
module.exports = {ticketDocument};

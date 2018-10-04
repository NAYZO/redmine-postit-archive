const _ = require('lodash');
const fs = require('fs');
const util = require('util');
const config = require('./config');
const QRCode = require('qrcode');
const drawMultilineText = require('canvas-multiline-text')
const Canvas = require('canvas');

const Image = Canvas.Image;
const writeFile = util.promisify(fs.writeFile)

const fullWidth = 2100;// margin: 100
const fullHeight = 2970;// margin: 170
const ts = 750;
const wRatio = 1.0144927536;
const hRatio = 1.0357142857;

const drawQrCode = (ctx, text, x, y, width) => new Promise(async (resolve, reject) => {
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, x, y);
        resolve();
    };
    img.src = await QRCode.toDataURL(text, { width });
});

const drawTicket = async (ctx, ticket, xPos, yPos) => {

    // Project.
    ctx.textAlign = "center";
    ctx.font = "bold 40px Arial";
    ctx.fillStyle = 'orange';
    ctx.fillText(ticket.project.toUpperCase(), (xPos + ts / 2) * wRatio, (yPos + 10) * hRatio + 80);

    // Id.
    ctx.font = "50px Arial";
    ctx.fillStyle = 'black';
    ctx.textAlign = "center";
    ctx.fillText(`#${ticket.id}`, (xPos + 200) * wRatio, (yPos + ts - 50) * hRatio);

    // Category.
    if (ticket.category) {
        ctx.font = "bold 35px Arial";
        ctx.fillStyle = 'black';
        ctx.textAlign = "center";
        ctx.fillText(ticket.category, (xPos + ts / 2) * wRatio, (yPos + 10 + 150) * hRatio);
    }

    // Title.
    ctx.fillStyle = 'blue';
    ctx.textAlign = "center";
    drawMultilineText(ctx, ticket.subject, {
        rect: {
            x: (xPos + ts / 2) * wRatio,
            y: (yPos + 210) * hRatio,
            width: ts * wRatio,
            height: 200 * hRatio
        },
        font: 'Arial',
        verbose: false,
        lineHeight: 1.4,
        minFontSize: 60,
        maxFontSize: 100
    })

    // Complexity.
    if (ticket.complexity) {
        ctx.beginPath();
        ctx.arc((xPos + 200) * wRatio, (yPos + ts - 250) * hRatio, 70, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#EEE';
        ctx.fill();

        ctx.font = "bold 50px Arial";
        ctx.fillStyle = 'black';
        ctx.textAlign = "center";
        ctx.fillText(`${ticket.complexity}`, (xPos + 200) * wRatio, (yPos + ts - 235) * hRatio);
    }

    // QR code.
    const url = config.getTicketUrl(ticket);
    const qrPromise = await drawQrCode(ctx, url, (xPos + ts - 375) * wRatio, (yPos + ts - 375) * hRatio, 350 * hRatio);
}

const buildPdf = async (pdfPath, tickets) => {
    const canvas = new Canvas(fullWidth, fullHeight, 'pdf');
    const ctx = canvas.getContext('2d');

    // Page border.
    ctx.strokeRect(0, 0, fullWidth, fullHeight);

    // Tickets Positionning.
    let xPos;
    let yPos;
    const pages = _.chunk(tickets, 6);
    for (const [pageIndex, page] of pages.entries()) {
        xPos = 0;
        yPos = 0;
        const cols = _.chunk(page, 3);
        for (const [colIndex, col] of cols.entries()) {
            for (const [ticketIndex, ticket] of col.entries()) {
                // Draw ticket.
                //ctx.strokeRect(xPos * wRatio, yPos * hRatio, ts * wRatio, ts * hRatio);
                await drawTicket(ctx, ticket, xPos, yPos);

                yPos += ts;
            }
            xPos += ts;
            yPos = 0;
        }
        ctx.addPage();
    }
    console.log(`PDF built. ${pages.length} page(s).`);
    await writeFile(pdfPath, canvas.toBuffer());
}

module.exports = { buildPdf };
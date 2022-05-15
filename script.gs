// Please enter your webhooks below, inside the quotations, you can have multiple, as long as you format like this: "LINK_1", "LINK_2", "LINK_3"
const webhooks = [""];

// This defines the variables, of which can be filled out; these are completely optional.

// Title can either be what you enter below, but if you leave blank, the script will fill it with the form title.
// Avatar Image is the tiny thumbnail you see on embeds, this is great for a logo.
// Short Description is great if you wish to add a tiny bit of information.
// Colour allows you to enter a custom hex color, if left blank, a colour will be randomly chosen each time.
// Mention is great if you want to be alerted, or you want a certain role alerted. Mention either the user/role in Discord with a \ at the beginning to the formatting.
// Type is a new required variable, state either "EMBED" or "TEXT" - the default is embed.

const title = "", avatarImage = "", shortDescription = "", colour = "", mention = "", type = "";

// Bonus features 😃
// You can turn these ON or OFF, defaults to the values entered below.

const bonusFeatures = {
    convert2Link: 'ON', // Links in embeds will be clickable | Text links won't embed.
    convert2Mention: 'ON' // Checks if there's a Discord ID, and converts it into a mention.
}


// This defines and fetches the current form, all the responses from the form, the latest response received, and the items from the Q&A's from the latest res.
// Items is set up to store the Q&A's.
const form = FormApp.getActiveForm(), allResponses = form.getResponses(), latestResponse = allResponses[allResponses.length - 1];
let response;
var items = [];

// Checks if there's a response, if not - throw error.
try {
    response = latestResponse.getItemResponses()
} catch (error) {
    throw "No Responses found in your form."
}

// Just a safe check to make sure you've entered a webhook.
for (const hook of webhooks) {
    if (!/^(?:https?:\/\/)?(?:www\.)?(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-+]+$/i.test(hook)) throw `Webhook ${i + 1 || 1} is not valid.`;
}

// An extra check as people have been having issues.
if (avatarImage && !/\.(jpeg|jpg|gif|png)$/.test(avatarImage)) throw "Image URL is not a direct link";


// This loops through our latest response and fetches the Question titles/answers; then stores them in the items array above.
for (var i = 0; i < response.length; i++) {
    const question = response[i].getItem().getTitle(), answer = response[i].getResponse();
    if (answer == "") continue;
    items.push({ "name": question, "value": answer });

    function data(item) {
        const linkValidate = /(?:(?:https?|http?):\/\/)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/i;

        // Checks if there's an ID, if there is, convert into a mention.
        if (bonusFeatures.convert2Mention == 'ON' && !isNaN(item.value) && item.value.length == 18) item.value = `<@!${item.value}>`;

        // Checks if type is text, or default to embed.
        if (bonusFeatures.convert2Link == 'ON' && type.toLowerCase() !== 'text') {
            // Validates the link, if it's true, make it a hyperlink for embed.
            if (linkValidate.test(item.value)) item.value = `[${item.value}](${item.value})`;
        } else {
            // Validates the link, if it's true, make it not-embed for text.
            if (bonusFeatures.convert2Link == 'ON' && linkValidate.test(item.value)) item.value = `<${item.value}>`;
        }

        return [`**${item.name}**`, `${item.value}`].join("\n");
    }
}

function plainText(e) {
    const textLimit = 2000;
    let preText = `${mention ? mention : ''}${title ? `**${title}**` : `**${form.getTitle()}**`}\n\n${shortDescription ? `${shortDescription}\n\n` : ''}`;

    let contentChunks = splitItemsIntoChunks(items, preText, textLimit)

    contentChunks.forEach(content => {
        // A webhook construct, which sets up the correct formatting for sending to Discord.
        const text = {
            "method": "post",
            "headers": { "Content-Type": "application/json" },
            "muteHttpExceptions": true,
            "payload": JSON.stringify({
                "content": content
            }),
        };

        // We now loop through our webhooks and send them one by one to the respectful channels.
        for (var i = 0; i < webhooks.length; i++) { UrlFetchApp.fetch(webhooks[i], text); };
    });
}

function embedText(e) {
    const textLimit = 4096;
    let preText = shortDescription ? `${shortDescription}\n\n` : '';
    let contentChunks = splitItemsIntoChunks(items, preText, textLimit)

    let index = 0;
    contentChunks.forEach(content => {
        //for (var i = 0; i < contentChunks.length; i++) {
        //  let content = contentChunks[i];
        // A webhook embed construct, which sets up the correct formatting for sending to Discord.  
        index++;
        const embed = {
            "method": "post",
            "headers": { "Content-Type": "application/json" },
            "muteHttpExceptions": true,
            "payload": JSON.stringify({
                "content": mention ? mention : '',
                "embeds": [{
                    "title": `${title ? title : form.getTitle()}${contentChunks.length > 1 ? ` ${index}` : ''}`, // Either the set title or the forms title.
                    "description": content, // Either the desc or just the res.
                    "thumbnail": { url: avatarImage ? encodeURI(avatarImage) : null }, // The tiny image in the right of the embed
                    "color": colour ? parseInt(colour.substr(1), 16) : Math.floor(Math.random() * 16777215), // Either the set colour or random.
                    "timestamp": new Date().toISOString() // Today's date.
                }]
            }),
        };

        // We now loop through our webhooks and send them one by one to the respectful channels.
        for (var i = 0; i < webhooks.length; i++) { UrlFetchApp.fetch(webhooks[i], embed); };
    });
    //}
}

function splitItemsIntoChunks(items, preText, textLimit) {
    var contentChunks = [];
    var currentTextChunk = preText;

    items.forEach(item => {
        let itemText = `${data(item)}`;
        if (itemText.length >= textLimit) {
            itemText.split(/(\s+)/).forEach(word => {
                let result = addToChunkOrSplit(currentTextChunk, textLimit - currentTextChunk.length, contentChunks, word);
                contentChunks = result.contentChunks;
                currentTextChunk = result.currentTextChunk;
            });
            const newline = '\n\n';
            let result = addToChunkOrSplit(currentTextChunk, textLimit - currentTextChunk.length, contentChunks, newline);
            contentChunks = result.contentChunks;
            currentTextChunk = result.currentTextChunk;
        } else {
            const itemTextFormatted = `${itemText}\n\n`;
            let result = addToChunkOrSplit(currentTextChunk, textLimit, contentChunks, itemTextFormatted);
            contentChunks = result.contentChunks;
            currentTextChunk = result.currentTextChunk;
        }
    });
    if (currentTextChunk != contentChunks[contentChunks.length - 1]) contentChunks.push(currentTextChunk.trim());
    return contentChunks;
}

function addToChunkOrSplit(currentTextChunk, textLimit, contentChunks, text) {
    if (text.length + currentTextChunk.length >= textLimit) {
        contentChunks.push(currentTextChunk.trim());
        currentTextChunk = text;
    } else {
        currentTextChunk += text;
    }
    return { currentTextChunk: currentTextChunk, contentChunks: contentChunks };
}

function isEmptyOrSpaces(str) {
    return str === null || str === undefined || str.match(/^ *$/) !== null;
}
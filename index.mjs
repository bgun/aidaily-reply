import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: "us-east-1" }); // Replace with your preferred region

export const handler = async (event) => {
    try {
        // console.log("EVENT", event);

        const decodedMultipart = Buffer.from(event.body, 'base64').toString('utf-8');
        console.log("BASE64 ONLY:", decodedMultipart);

        // It took me frustrating hours of trying to parse this with a library and eventually just did it myself.
        // Very quick and dirty but it works.
        const parts = decodedMultipart.split('--xYzZY');
        const partsObject = {};
        const cdRegex = /\r\n(?:Content-Disposition: form-data; name="[^"]+"\r\n\r\n)/g;  
        parts.forEach(part => {
            let nameRegex = /form-data; name="(.+)"/;
            let match = part.match(nameRegex);
            if (match) {
                part = part.replace(cdRegex, '');
                partsObject[match[1]] = part;
                console.log(match[1], part);
            }
        });

        const finalEmail = JSON.parse(partsObject.envelope).from;
        const finalText = partsObject.text.split('\r\n\r\nOn')[0];

        console.log("FINAL FROM: ", finalEmail);
        console.log("FINAL TEXT: ", finalText);

        // Create a JSON object with the parsed data
        const data = {
            from,
            subject,
            text,
            html,
            timestamp: new Date().toISOString()
        };

        // Define S3 bucket and key for the document
        const bucketName = "your-bucket-name"; // Replace with your S3 bucket name
        const key = `inbound-emails/${Date.now()}.json`;

        // Prepare the S3 put command
        const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: JSON.stringify(data),
            ContentType: "application/json"
        });

        // Upload the document to S3
        await s3Client.send(putCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Email data successfully stored in S3" })
        };
    } catch (error) {
        console.error("Error processing inbound email:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error processing inbound email" })
        };
    }
};

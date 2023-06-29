import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { PassThrough } from "stream"; 
// for creating a duplex stream that can be both read from and written to.
import { Upload } from "@aws-sdk/lib-storage"; 
// used to upload an object to an S3 bucket
import sharp from "sharp";
// for resizing the image

export const handler = async (event) => {
  // Get the object from the event and show its content type
  const region = event.Records[0].awsRegion;
  const sourceBucket = event.Records[0].s3.bucket.name;
  const sourceKey = event.Records[0].s3.object.key;
  const splittedSourceKey = sourceKey.split("/");
  const fileName = splittedSourceKey.pop();
  const destinationPrefix = splittedSourceKey
    .join("/")
    .replace("original", "resized");
  const destinationKey = `${destinationPrefix}/resized-${fileName}`;
  console.log(region, sourceBucket, decodeURI(sourceKey), destinationKey);
  const s3Client = new S3Client({
    region: region,
  });
  // Read the original image from the S3 bucket
  const originalImageObject = await s3Client.send(
    new GetObjectCommand({ Bucket: sourceBucket, Key: sourceKey })
  );
  // Resize the image using sharp
  const resizeStream = sharp()
    .rotate()
    .resize({
      width: 200,
      height: 200,
      fit: sharp.fit.inside,
      withoutEnlargement: true,
    })
    .webp();
  // Write the resized image to a new object in the same S3 bucket with different prefix (folder)
  const passThrough = new PassThrough();
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: sourceBucket,
      Key: destinationKey,
      Body: passThrough,
      ContentType: "image/webp",
    },
  });

  originalImageObject.Body.pipe(resizeStream).pipe(passThrough);
  await upload.done();
  // pass request to S# when uploading of resized image is finished
};

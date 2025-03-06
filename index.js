const mongoose = require('mongoose');
const express = require('express');
const stream = require('stream');
const multer = require('multer');

require('dotenv').config();

const app = express();

async function connectToDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("connect to db successful")
  } catch (e){
    console.log("Error connecting to db", e)
  }
}

const imageSchema = new mongoose.Schema({
  filename : String,
  image : Buffer,
  contentType : String
})

const Image = mongoose.model('Image', imageSchema)

const upload = multer({
  storage : multer.memoryStorage(),
  limits : {fileSize : 5 * 1024 * 1024},
  fileFilter : (req, file, cb) => {
    const allowedTypes = ['image/jpg', 'image/png', 'image/jpeg']
    if(allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    }
    else {
      cb(new Error('Invalid file type. Only JPG and PNG are allowed.'), false)
    }
  }
})

// Middleware to upload a single image and handle errors
const uploadSingleImageHandler = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Upload an image example: /upload
app.post("/upload", uploadSingleImageHandler('image'), async (req, res) => {
  try {
    if(!req.file) {
      return res.status(400).json({error : "No file provided"})
    }

    const newImage = new Image({
      filename : req.file.originalname,
      image : req.file.buffer,
      contentType : req.file.mimetype
    })

    await newImage.save();

    res.status(200).json({
      message : "uploaded successfully",
      id : newImage._id
    })
  } catch(e) {
    res.status(500).json({error : e.message})
  }
})

// Get an image by its id example: /image/imageId
app.get('/image/:id', async (req, res) => {
  try {
    // Check if the id is valid
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid image id' });
    }

    // Find the image in the database
    const image = await Image.findById(id);
    if(!image) {
      return res.status(404).json({error : "Image not found"})
    }

    // Set the appropriate content type and return the image
    res.set('Content-Type', image.contentType);
    const readStream = new stream.PassThrough();
    readStream.end(image.image);
    readStream.pipe(res);

  } catch(e) {
    console.log(e)
    res.status(500).json({error : e.message})
  }
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  connectToDB();
});
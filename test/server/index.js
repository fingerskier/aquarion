import download from './download'
import express from 'express'

const app = express()


app.get('/download', (req, res) => {
  const file = download()

  res.download(file, 'example.zip', (err) => {
      if (err) {
          console.error('Error sending file:', err);
      } else {
          console.log('File sent successfully!');
      }
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
});

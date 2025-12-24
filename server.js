require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Database Connected'))
    .catch(err => console.error(err));

// --- SCHEMA UPDATE ---
const contentSchema = new mongoose.Schema({
    tmdbId: String,
    title: String,
    overview: String,
    posterPath: String,
    backdropPath: String,
    releaseDate: String,
    category: String,
    type: { type: String, default: 'movie' },
    
    // Movie Links
    streamLink: String,
    download480: String,
    download720: String,
    download1080: String,

    // Web Series Batch Links (4 Slots as requested)
    batchLink1: String, // e.g. 480p Zip
    batchLink2: String, // e.g. 720p Zip
    batchLink3: String, // e.g. 1080p Zip
    batchLink4: String, // e.g. Mirror / 4K

    // Web Series Episodes
    episodes: [{
        season: String,
        episode: String,
        streamLink: String,
        downloadLink: String // Single Episode Download
    }],

    addedAt: { type: Date, default: Date.now }
});

const Content = mongoose.model('Content', contentSchema);

// --- ROUTES ---

// ADD / EDIT CONTENT
app.post('/api/add-content', async (req, res) => {
    try {
        const { id, tmdbId, type, category, episodes, streamLink, d480, d720, d1080, b1, b2, b3, b4 } = req.body;
        
        const axios = require('axios');
        const tmdbUrl = `https://api.themoviedb.org/3/${type === 'series' ? 'tv' : 'movie'}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`;
        const tmdbRes = await axios.get(tmdbUrl);
        const data = tmdbRes.data;

        const commonData = {
            tmdbId: data.id,
            title: data.title || data.name,
            overview: data.overview,
            posterPath: "https://image.tmdb.org/t/p/w500" + data.poster_path,
            backdropPath: "https://image.tmdb.org/t/p/original" + data.backdrop_path,
            releaseDate: data.release_date || data.first_air_date,
            category,
            type
        };

        if (id) {
            // EDIT
            const updateData = type === 'series' 
                ? { ...commonData, episodes, batchLink1: b1, batchLink2: b2, batchLink3: b3, batchLink4: b4 } 
                : { ...commonData, streamLink, download480: d480, download720: d720, download1080: d1080 };
            
            await Content.findByIdAndUpdate(id, updateData);
            res.json({ msg: "✅ Updated Successfully!" });
        } else {
            // NEW
            const newContent = new Content({
                ...commonData,
                streamLink: type === 'movie' ? streamLink : "",
                download480: d480, download720: d720, download1080: d1080,
                episodes: type === 'series' ? episodes : [],
                batchLink1: b1, batchLink2: b2, batchLink3: b3, batchLink4: b4
            });
            await newContent.save();
            res.json({ msg: "✅ Added Successfully!" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error: Check ID or Server Log" });
    }
});

// GET ALL
app.get('/api/contents', async (req, res) => {
    const contents = await Content.find().sort({ addedAt: -1 });
    res.json(contents);
});

// GET SINGLE
app.get('/api/content/:id', async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);
        res.json(content);
    } catch (err) {
        res.status(404).json({ msg: "Not Found" });
    }
});

// DELETE
app.delete('/api/content/:id', async (req, res) => {
    await Content.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });
});

// ... Upar ka code same rahega ...

// --- LOGIN ROUTE (NEW) ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const actualPass = process.env.ADMIN_PASS;

    if (password === actualPass) {
        // Agar password sahi hai, toh ek "Token" bhejo
        res.json({ success: true, token: "logged-in-secret-key" });
    } else {
        res.status(401).json({ success: false, msg: "Wrong Password!" });
    }
});

// ... Baki Add/Delete routes same rahenge ...

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
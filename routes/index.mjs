import express from 'express';

const router = express.Router();

router.get("/", function (req,res) {
    res.redirect("/articles");
});

export default router;
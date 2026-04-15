const express = require("express");
const router = express.Router();

const votes = require("../controllers/votes_controller");

router.post("/vote", votes.addVote);

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../js/debater-db");

router.get("/", (req, res, next) => {
  res.render("games", {
    games: db.gamesListUp()
  });
})
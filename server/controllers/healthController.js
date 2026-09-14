function getHealth(_req, res) {
  res.status(200).json({
    success: true,
    message: 'PathForge API is running',
  });
}

module.exports = {
  getHealth,
};

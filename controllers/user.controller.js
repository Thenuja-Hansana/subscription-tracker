export const getMe = (req, res) => {
    // The authorize middleware already loaded the signed-in user onto req.user
    res.json({ success: true, data: req.user });
};

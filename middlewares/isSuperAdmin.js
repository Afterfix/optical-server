const jwt = require('jsonwebtoken')

const isSuperAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Unauthorized: Missing or invalid Authorization header',
      })
    }
    const token = authHeader.split(' ')[1]

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Forbidden: Invalid token' })
      }
      console.log('decoded', decoded)
      if (decoded.role == 'super_admin') {
        return next()
      }

      return res
        .status(403)
        .json({ message: 'Access denied: Supper Admin privileges required.' })
    })
  } catch (error) {
    console.error('Authorization error:', error)
    res.status(500).json({ message: 'Authorization failed.' })
  }
}
module.exports = isSuperAdmin

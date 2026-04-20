class UnitValidator {
    
    createValidator = (req, res, next) => {
        let requiredFields = ['name', 'symbol'];  
        const missingFields = requiredFields.filter((field) => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: `Missing required fields: ${missingFields.join(', ')}`,
            });
        }

        next();
    };
}

module.exports = UnitValidator;
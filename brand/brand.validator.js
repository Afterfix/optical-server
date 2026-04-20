class BrandValidator {
    
    createValidator = (req, res, next) => {
        let requiredFields = ['name'];  
        const missingFields = requiredFields.filter((field) => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: `Missing required fields: ${missingFields.join(', ')}`,
            });
        }

        next();
    };
}

module.exports = BrandValidator;
const express = require('express');

const {check,body}= require('express-validator')

const authController = require('../controllers/auth');
const User=require('../models/user')
const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',[body('email')
.isEmail()
.withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }),
body('password','Password is not valid it must be greater than 5 characters.').isLength({min:5}).isAlphanumeric().trim()],authController.postLogin);

router.post('/signup',[check('email')
.isEmail() 
.withMessage('Enter a valid email')
.custom((value,{req})=>{
    return User.findOne({email:value}).then(userDoc=>{
        if(userDoc){
            return Promise.reject('E-mail already exist please pick a different one');
        }
})}).normalizeEmail({ gmail_remove_dots: false })
,
body('password','Enter a password with al least 5 charachters').isLength({min:5}).isAlphanumeric().trim(),
body('confirmPassword').custom((value,{req})=>{
    if(value!==req.body.password){
        throw new Error('password and confirm password doesnt match')
    }
    return true;
})
] ,authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset',authController.getReset);

router.post('/reset',authController.postReset);

router.get('/reset/:token',authController.getNewPassword);

router.post('/new-password',authController.postNewPassword);

module.exports = router;
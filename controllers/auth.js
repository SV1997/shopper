const crypto= require('crypto')
const User = require('../models/user');
const bcrypt=require('bcryptjs')
const nodemailer=require('nodemailer')
const {validationResult}= require('express-validator')
const transporter=nodemailer.createTransport({
  service: 'gmail',
  auth:{
    user:'saharsh.vashishtha@gmail.com',
    pass:'udvl mrmg rvtk fbbp'
  }
})
exports.getLogin = (req, res, next) => {
  message=req.flash('error');
  if(message.length>0){
    message=message[0];
  }
  else{
    message=null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errormessage: message,
    oldInput:{
      email:'',
      password:'',
    },
    validationErrors: []
  });
};

exports.getSignup = (req, res, next) => {
  message=req.flash('error');
  if(message.length>0){
    message=message[0];
  }
  else{
    message=null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errormessage: message,
    oldInput:{
      email:'',
      password:'',
      confirmPassword:''
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email=req.body.email;
  const password = req.body.password;
  const errors= validationResult(req);
  console.log(errors.array[0])
  if(!errors.isEmpty()){
    return   res.render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errormessage: errors.array()[0].msg,
      oldInput:{
        email:email,
        password:password
      },
      validationErrors: errors.array()
    });
  }
  User.findOne({email:email})
    .then(user => {
      if(!user){
        return  res.render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errormessage: 'invalid email or password',
          oldInput:{
            email:email,
            password:password
          },
          validationErrors: errors.array()
        });
      }
      bcrypt.compare(password, user.password).then(doMatch=>{
        if(doMatch){
          req.session.isLoggedIn=true;
          req.session.user=user;
          return req.session.save(err=>{
            console.log(err);
            return res.redirect('/')
          })
        }
        // req.flash('error', 'Invalid email or password.');
        return res.render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errormessage: 'invalid email or password',
          oldInput:{
            email:email,
            password:password
          },
          validationErrors: [  ]
        });
      }).catch(err=>{
        console.log(err);
        res.redirect('/login')
      })
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email= req.body.email;
  const password=req.body.password;
  const confirmedPassword= req.body.password;
  const errors=validationResult(req);
  if(!errors.isEmpty()){
    console.log(errors.array()[0])
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errormessage: errors.array()[0].msg,
      oldInput:{
        email:email,
        password:password,
        confirmPassword: req.body.confirmPassword
      },
      validationErrors: errors.array()
    })
  }
    bcrypt.hash(password,12)  .then(hashedPassword=>{
      const user = new User({
        email:email,
        password:hashedPassword,
        cart:{items:[]}
      })
      return user.save()
    })
    . then(
      result=>{
        res.redirect('/login')
        transporter.sendMail({
          to: email,
          from: "shoppers.stop@getMaxListeners.com",
          subject: "successfully signedup",
          html: "we are happy to inform you that you have signed up successfully"
        }).catch(err=>{
          console.log(err);
        });
      }
    )
.catch(err=>{
    console.log(err)
  })
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset=(req,res,next)=>{
  message=req.flash('error');
  if(message.length>0){
    message=message[0];
  }
  else{
    message=null;
  }
  res.render('auth/reset', {
    path: '/signup',
    pageTitle: 'Reset Passworsd',
    errormessage: message
  });
}

exports.postReset=(req,res,next)=>{
  crypto.randomBytes(32,(err,buffer)=>{
    if(err){
      console.log(err);
      return res.redirect('/reset');
    }
    const token= buffer.toString('hex');
    User.findOne({email:req.body.email}).then(user =>{
      if(!user){
        req.flash('error', 'no account with email found');
        return res.redirect('/reset');
      }
      user.resetToken=token;
      user.resetTokenExpiration=Date.now()+ 3600000;
      return user.save();
    }).then(result=>{
      res.redirect('/');
      transporter.sendMail({
        to: req.body.email,
        from: "shoppers.stop@gemail.com",
        subject: "Password reset",
        html: `
        <p>You requested a password reset</p>
        <p>click on this link to reset your password <a href="http://localhost:3000.reset/${token}">Link</a></p>`
      })

    })
  })
}

exports.getNewPassword=(req,res,next)=>{
  const token=req.pareams.token;
  User.findOne({resetToken: token, resetTokenExpiration:{$gt:Date.now()}})
  .then(user=>{
    res.render('auth/new-password', {
      path: '/new-password',
      pageTitle: 'New Passworsd',
      errormessage: message,
      userId:user._id.toString(),
      passwordToken: token
    });
  })
  message=req.flash('error');
  if(message.length>0){
    message=message[0];
  }
  else{
    message=null;
  }

}

exports.postNewPassword=(req,res,next)=>{
const newPassword=req.body.password;
const userId=req.body.userId;
const passwordToken=req.body.passwordToken;
let resetUser;
User.findOne({
  resetToken:passwordToken,
  resetTokenExpiration: {$gt:Date.now()},
  _id:userId
}).then(user=>{
  return bcrypt.hash(newPassword,12)
}).then(hashedPassword=>{
  resetUser.password=hashedPassword;
  resetUser.resetToken=null;
  resetUser.resetTokenExpiration=undefined;
  return resetUser.save();
}).then(res.redirect('/login'))
.catch(err=>{
  console,log(err)
})
}
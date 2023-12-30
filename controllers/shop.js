const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path=require('path');
const order = require('../models/order');
const stripe=require('stripe')(`${process.env.STRIPE_KEY}`);
const pdfkit=require('pdfkit');

const items_per_page=2;
exports.getProducts = (req, res, next) => {
  const page= req.query.page || 1;
  pageint=parseInt(page)
  let totalItems;
  Product.find().countDocuments().then(numProducts=>{
    totalItems=numProducts;
    return Product.find()
    .skip((page-1)*items_per_page)
    .limit(items_per_page)
  }).then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Products',
        path: '/products',
        currentPage: parseInt(page),
        hasNextPage: items_per_page*page<totalItems,
        hasPreviousPage: page>1,
        nextPage: pageint+1,
        previousPage:pageint-1,
        lastPage:Math.ceil(totalItems/items_per_page)
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',

      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
  const page= req.query.page || 1;
  pageint=parseInt(page)
  let totalItems;
  Product.find().countDocuments().then(numProducts=>{
    totalItems=numProducts;
    return Product.find()
    .skip((page-1)*items_per_page)
    .limit(items_per_page)
  }).then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: parseInt(page),
        hasNextPage: items_per_page*page<totalItems,
        hasPreviousPage: page>1,
        nextPage: pageint+1,
        previousPage:pageint-1,
        lastPage:Math.ceil(totalItems/items_per_page)
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};


exports.getCheckout=(req,res,next)=>{
  let products;
  let total=0;
  req.user
  .populate('cart.items.productId')
  .then(user => {
    products = user.cart.items;
    total=0;
    products.forEach(p =>{
      total+=p.quantity*p.productId.price;
    })
    return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: products.map(p=>{
          return {
            price_data:{
              unit_amount: p.productId.price*100,
              currency:'usd',
              product_data:{
                name:p.productId.title,
                description: p.productId.description
              }
            },
            quantity: p.quantity
          }
        }),
        success_url: req.protocol+'://'+req.get('host')+'/checkout/success',
        cancel_url: req.protocol+'://'+req.get('host')+'/checkout/cancel'
    })

  }).then(session=>{
    console.log(products,'prod')
    res.render('shop/checkout', {
      path: '/checkout ',
      pageTitle: 'checkout',
      products: products,
      isAuthenticated: req.session.isLoggedIn,
      totalSum:total,
      sessionId:session.id
    });
  })
  .catch(err => console.log(err));
}

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getInvoice=(req,res,next)=>{
  const orderId= req.params.orderId;
  Order.findById(orderId).then(order=>{
    if(!order){
    return next(new Error('No Order Found.'));
    }
  if(order.user.userId.toString()!==req.user._id.toString()){
    return next(new Error('Unauthorized'))
  }
})
.catch(err=>{
  console.log(err);
})
  const invoiceName= 'invoice-'+orderId+'.pdf';
  const filepath=path.join('data', 'invoices',invoiceName)
  const pdfDoc=new pdfkit()
  pdfDoc.pipe(fs.createWriteStream(filepath));
  pdfDoc.pipe(res);
  pdfDoc.text('hello hi karva lo');
  let totalPrice=0;
  order.products.forEach(prod=>{
    totalPrice=totalPrice+prod.quantity*prod.product.price
    pdfDoc.text(prod.product.title+'-'+prod.quantity+'x'+'$'+prod.product.price);
  })
  pdfDoc.text('Total Price:'+ totalPrice)
  pdfDoc.end();
  // fs.readFile(filepath, (err,data)=>{
  //   if(err){
  //     return next(err);
  //   }
  //   res.setHeader('Content-Type', 'application/pdf');
  //   res.setHeader('Content-Disposition', 'inline:filename="'+invoiceName+'"');
  //   res.send(data);
  // })
  const file= fs.createReadStream(filepath);
  res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline:filename="'+invoiceName+'"');
   file.pipe(res)
}
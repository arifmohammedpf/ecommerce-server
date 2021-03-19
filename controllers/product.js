const Product = require("../models/product");
const User = require("../models/user");
const slugify = require("slugify");

exports.create = async (req, res) => {
  try {
    console.log(req.body);
    req.body.slug = slugify(req.body.title);
    const newProduct = await new Product(req.body).save();
    res.json(newProduct);
  } catch (err) {
    console.log(err);
    // res.status(400).send("Product create failed");
    res.status(400).json({
      err: err.message,
    });
  }
};

exports.listAll = async (req, res) => {
  let products = await Product.find({})
    .limit(parseInt(req.params.count)) //in req.params.count, count is name given in routes, ie. prod/:count
    .populate("category")
    .populate("subs")
    .sort([["createdAt", "desc"]])
    .exec();
  res.json(products);
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Product.findOneAndRemove({
      slug: req.params.slug,
    }).exec();
    res.json(deleted);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Product delete failed");
  }
};

exports.read = async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate("category")
    .populate("subs")
    .exec();
  res.json(product);
};

exports.update = async (req, res) => {
  try {
    //remove the if statement if you dont want to change slug when title is changed
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const updated = await Product.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true } //new:true is given so u get updated data as res, else old data will be the res
    ).exec();
    res.json(updated);
  } catch (err) {
    console.log("PRODUCT UPDATE ERROR--->", err);
    // return res.status(400).send("Product update failed");
    res.status(400).json({
      err: err.message,
    });
  }
};

// //WITHOUT PAGINATION
// exports.list = async (req, res) => {
//   try {
//     //createdAt/updatedAt(sort), desc/asc(order), 3(limit)
//     const { sort, order, limit } = req.body;
//     const products = await Product.find({})
//       .populate("category")
//       .populate("subs")
//       .sort([[sort, order]])
//       .limit(limit)
//       .exec();

//     res.json(products);
//   } catch (err) {
//     console.log(err);
//   }
// };

//WITH PAGINATION
exports.list = async (req, res) => {
  try {
    //createdAt/updatedAt(sort), desc/asc(order), page
    const { sort, order, page } = req.body;
    const currentPage = page || 1;
    const perPage = 3;

    const products = await Product.find({})
      .skip((currentPage - 1) * perPage)
      .populate("category")
      .populate("subs")
      .sort([[sort, order]])
      .limit(perPage)
      .exec();

    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

exports.productsCount = async (req, res) => {
  let total = await Product.find({}).estimatedDocumentCount().exec();
  res.json(total);
};

exports.productStar = async (req, res) => {
  const product = await Product.findById(req.params.productId).exec();
  const user = await User.findOne({ email: req.user.email }).exec();
  const { star } = req.body;

  //who is updating?
  //check if user already rated the product
  let existingRatingObject = product.ratings.find(
    (elem) => elem.postedBy.toString() === user._id.toString()
  );

  //if user haven't rated yet, push it
  if (existingRatingObject === undefined) {
    let ratingAdded = await Product.findByIdAndUpdate(
      product._id,
      {
        $push: { ratings: { star, postedBy: user._id } }, //$push is mongoose way to update array
      },
      { new: true }
    ).exec();
    console.log("ratingsAdded ---> ", ratingAdded);
    res.json(ratingAdded);
  } else {
    //if user have already rated, update it
    const ratingUpdated = await Product.updateOne(
      { ratings: { $elemMatch: existingRatingObject } },
      { $set: { "ratings.$.star": star } }, //'$' is mongoose way..check docs
      { new: true }
    ).exec();
    console.log(ratingUpdated);
    res.json(ratingUpdated);
  }
};

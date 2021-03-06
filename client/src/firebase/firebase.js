import * as firebase from "firebase/app";
import "firebase/firestore";
import "firebase/storage";
import { forEach as pForEach, filter } from "p-iteration";
import {
  CUSTOMERTYPE,
  PRODUCTS,
  CATEGORY,
  TYPE,
  VARIATIONS,
  CREATEDAT,
  NAME,
  CART,
  USERNAME,
  ORDERS,
} from "../constants/firebaseContant";
import config from "./config";

!firebase.apps.length && firebase.initializeApp(config);

const firestore = firebase.firestore();
const PAGE_LIMIT = 10;
export const storage = firebase.storage();
export const getAllProductsByCustomerTypeAndType = async (
  customerType,
  type,
  filterConditions,
  page
) => {
  try {
    console.log("firebase")
    let productList = [];
    let getProductArray = [];
    const filterOptions = Object.keys(filterConditions);
    let productCursor = parseInt(page) === 1 ? 0 : (page - 1) * PAGE_LIMIT; // minus one to match array's index
    let query = firestore
      .collection("products")
      .where("customerType", "==", customerType);
    if (!!filterConditions.category) {
      query = query.where(CATEGORY, "==", filterConditions.category);
    }
    if (!!type) {
      query = query.where(TYPE, "==", type);
    }
    const hasFilter = (obj) => {
      const filter = Object.keys(obj).reduce((prev, cur) => {
        return prev || !!obj[cur];
      }, false);
      return filter;
    };
    if (hasFilter(filterConditions)) {
      const products = await query.get();
      let filtersAppliedProducts = [];
      products.forEach((doc) => {
        getProductArray.push(doc);
      });
      let categoryIndex = filterOptions.indexOf("category");
      filterOptions.splice(categoryIndex, 1);
      await pForEach(getProductArray, async (doc) => {
        let variations = firestore
          .collection(PRODUCTS)
          .doc(doc.id)
          .collection(VARIATIONS);
        filterOptions.forEach((item) => {
          if (filterConditions[item]) {
            console.log(item)
            variations = variations.where(item, "==", filterConditions[item]);
          }
        });
        let variationsDocs = await variations.get();
        if (variationsDocs.size > 0) {
          filtersAppliedProducts.push(doc.data());
        }
      });
      //up until now we already have an array of docs that meet the filter conditions
      return filtersAppliedProducts.slice(
        //get docs begin from index productCursor which is equals to (page-1)*limit
        productCursor,
        productCursor + PAGE_LIMIT //stop at "limit" amount of docs
      );
    } else {
      const producstSnapshot = await query.orderBy("createdAt").get();

      if (producstSnapshot.size > 0) {
        const productAnchor =
          producstSnapshot.docs[
            productCursor <= producstSnapshot.docs.length - 1
              ? productCursor
              : producstSnapshot.docs.length - 1
          ];

        let products;
        const productsQuery = query.orderBy("createdAt");
        if (productCursor <= producstSnapshot.docs.length - 1) {
          products = await productsQuery
            .startAt(productAnchor.data().createdAt)
            .limit(PAGE_LIMIT)
            .get();
        } else {
          return productList;
        }
        products.forEach((item) => {
          productList.push(item.data());
        });
      }
      return productList;
    }
  } catch (error) {
    console.log(error);
  }
};

export const getAllBrand = async () => {
  try {
    const brandList = [];
    const query = await firestore.collection(PRODUCTS);
    const productRef = await query.get();
    productRef.forEach((item) => {
      brandList.push(item.data().brand);
    });
    const returnArray = [...new Set(brandList)];
    return returnArray;
  } catch (error) {
    console.log(error);
  }
};

export const getAllCategory = async () => {
  try {
    const categoryList = [];
    const query = await firestore.collection(PRODUCTS);
    const productsRef = await query.get();
    productsRef.forEach((item) => {
      categoryList.push(item.data().category);
    });
    const returnArray = [...new Set(categoryList)];
    return returnArray;
  } catch (error) {
    console.log(error);
  }
};

export const getCategoryByCustomerTypeAndType = async (customterType, type) => {
  try {
    const categoryList = [];
    const query = firestore
      .collection(PRODUCTS)
      .where(CUSTOMERTYPE, "==", customterType);
    if (type) {
      query.where(TYPE, "==", type);
    }

    const products = await query.get();
    products.forEach((item) => {
      categoryList.push(item.data().category);
    });
    return [...new Set(categoryList)];
  } catch (error) {
    console.log(error);
  }
};

export const getOneProduct = async (productName) => {
  try {
    let productObj = {};
    const productList = [];
    const variations = [];
    const colors = [];
    const sizes = [];
    const queryProduct = await firestore
      .collection(PRODUCTS)
      .where(NAME, "==", productName);
    const product = await queryProduct.get();
    const queryVariation = await firestore
      .collection(PRODUCTS)
      .doc(productName)
      .collection(VARIATIONS)
      .get();
    queryVariation.forEach((item) => {
      variations.push(item.data());
    });
    variations.forEach((variation) => {
      colors.push(variation.color);
      sizes.push(variation.size);
    });
    product.forEach((item) => {
      productList.push(item.data());
    });
    const productData = productList[0];
    productObj = {
      category: productData.category,
      createdAt: productData.createdAt,
      customerType: productData.customerType,
      name: productData.name,
      price: productData.price,
      type: productData.type,
      imageUrl: productData.imageUrl,
      colors: [...new Set(colors)],
      sizes: [...new Set(sizes)],
    };
    return productObj;
  } catch (error) {
    console.log(error);
  }
};

export const getAllProduct = async (page) => {
  try {
    const productList = [];
    let productCursor = parseInt(page) === 1 ? 0 : (page - 1) * 5; // minus one to match array's index

    // const products = await firestore.collection(PRODUCTS).orderBy(CREATEDAT).limit(5).get();
    const query = firestore.collection(PRODUCTS);
    const producstSnapshot = await query.orderBy("createdAt").get();
    if (producstSnapshot.size > 0) {
      const productAnchor =
        producstSnapshot.docs[
          productCursor <= producstSnapshot.docs.length - 1
            ? productCursor
            : producstSnapshot.docs.length - 1
        ];

      let products;
      const productsQuery = query.orderBy("createdAt");
      if (productCursor <= producstSnapshot.docs.length - 1) {
        products = await productsQuery
          .startAt(productAnchor.data().createdAt)
          .limit(5)
          .get();
      } else {
        return productList;
      }
      products.forEach((item) => {
        productList.push(item.data());
      });
    }
    return productList;
  } catch (error) {
    console.log(error);
  }
};

export const addProduct = async (productDetails) => {
  try {
    const checkExist = await (
      await firestore.collection(PRODUCTS).doc(productDetails.name).get()
    ).exists;
    if (checkExist) {
      throw "Product already exists";
    }
    const productDoc = {
      name: productDetails.name,
      customerType: productDetails.customerType,
      category: productDetails.category,
      type: productDetails.type,
      createdAt: new Date().toISOString(),
      price: productDetails.price,
      imageUrl: [...productDetails.imageUrl],
      color: productDetails.colors
    };
    await firestore.doc(`/products/${productDetails.name}`).set(productDoc);
    productDetails.colors.forEach((color) => {
      productDetails.sizes.forEach((size) => {
        const productVariations = {
          amount: productDetails.amount,
          color: color,
          size: size,
        };
        firestore
          .doc(`/products/${productDetails.name}`)
          .collection(VARIATIONS)
          .add(productVariations);
      });
    });
  } catch (error) {
    console.log(error);
  }
};
export const uploadImages = async (files) => {
  let urlArray = [];
  // for (const item of files) {
  //   const uploadTask = storage.ref(`/images/${item.name}`).put(item);
  //   uploadTask.on("state_changed", console.log, console.error, async () => {
  //     // storage
  //     //   .ref("images")
  //     //   .child(item.name)
  //     //   .getDownloadURL()
  //     //   .then((fileUrl) => {
  //     //     console.log(fileUrl);
  //     //     imageUrlArray.push(fileUrl);
  //     //     console.log(imageUrlArray);
  //     //   });
  //     const result = await storage.ref('images').child(item.name).getDownloadURL();
  //     urlArray.push(result);
  //   });
  // }
  await pForEach(files, async (item) => {
    await storage.ref(`/images/${item.name}`).put(item);
    // uploadTask.on("state_changed", console.log, console.error, async () => {
    const result = await storage
      .ref("images")
      .child(item.name)
      .getDownloadURL();
    urlArray.push(result);
    // });
  });
  return urlArray;
};

export const addProductToCart = async (cartData) => {
  try {
    const checkExist = (
      await firestore.collection(CART).doc(cartData.userId).get()
    ).exists;
    if (checkExist) {
      if (cartData.product.color && cartData.product.size) {
        await firestore
          .collection(CART)
          .doc(cartData.userId)
          .update({
            products: firebase.firestore.FieldValue.arrayUnion(
              cartData.product
            ),
          });
        alert("added succesfully");
      } else {
        alert("Please select the size and color you want!");
      }
    } else {
      if (cartData.product.color && cartData.product.size) {
        let cartObj = {
          username: cartData.username,
          products: [cartData.product],
        };
        await firestore.collection(CART).doc(cartData.userId).set(cartObj);
        alert("added succesfully");
      } else {
        alert("Please select the size and color you want!");
      }
    }
  } catch (error) {
    console.log(error);
  }
};

export const getCart = async (username) => {
  try {
    let cartData = {};
    const query = await firestore
      .collection(CART)
      .where(USERNAME, "==", username)
      .get();
    query.forEach((item) => {
      cartData.products = item.data().products;
    });
    return cartData;
  } catch (error) {
    console.log(error);
  }
};

export const getAllOrder = async (page) => {
  try {
    // let orderList = [];
    // const query = await firestore.collection(ORDERS).get();
    // query.forEach((item) => {
    //   orderList.push(item.data());
    // });
    // return orderList;
    const LIMIT = 5
    const orderList = [];
    let orderCursor = parseInt(page) === 1 ? 0 : (page - 1) * LIMIT; // minus one to match array's index
    const query = firestore.collection(ORDERS);
    const ordersSnapshot = await query.orderBy("createdAt").get();
    if (ordersSnapshot.size > 0) {
      const ordersAnchor =
        ordersSnapshot.docs[
          orderCursor <= ordersSnapshot.docs.length - 1
            ? orderCursor
            : ordersSnapshot.docs.length - 1
        ];

      let orders;
      const ordersQuery = query.orderBy("createdAt");
      if (orderCursor <= ordersSnapshot.docs.length - 1) {
        orders = await ordersQuery
          .startAt(ordersAnchor.data().createdAt)
          .limit(5)
          .get();
      } else {
        return orderList;
      }
      orders.forEach((item) => {
        orderList.push(item.data());
      });
    }
    return orderList;
  } catch (error) {
    console.log(error);
  }
};

export const createAnOrder = async (orderDetails) => {
  try {
    console.log(orderDetails);

    const orderObject = {
      orderId: orderDetails.orderId,
      products: orderDetails.products,
      status: orderDetails.status,
      userId: orderDetails.userId,
      createdAt: new Date().toISOString(),
    };
    if (orderObject.products && orderObject.userId) {
      await firestore
        .collection(ORDERS)
        .doc(orderDetails.orderId)
        .set(orderObject);
    }
    return "successfully";
  } catch (error) {
    console.log(error);
  }
};
export const deleteUserCart = async (userId) => {
  try {
    const checkExist = (await firestore.collection(CART).doc(userId).get())
      .exists;
    if (checkExist) {
      await firestore.collection(CART).doc(userId).delete();
    }
  } catch (error) {
    console.log(error);
  }
};

export const markOrderComplete = async (orderId) => {
  try {
    const checkExist = (await firestore.collection(ORDERS).doc(orderId).get())
      .exists;
    if (checkExist) {
      await firestore.collection(ORDERS).doc(orderId).update({
        status: "complete",
      });
    } else {
      throw "Order does not exist";
    }
  } catch (error) {
    alert(error);
  }
};
export const markOrderCanceled = async (orderId) => {
  try {
    const checkExist = (await firestore.collection(ORDERS).doc(orderId).get())
      .exists;
    if (checkExist) {
      await firestore.collection(ORDERS).doc(orderId).update({
        status: "canceled",
      });
    } else {
      throw "Order does not exist";
    }
  } catch (error) {
    throw error;
  }
};

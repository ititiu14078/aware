const { admin, db } = require("../util/admin");

const config = require("../util/config");

const firebase = require("firebase");

firebase.initializeApp(config);

exports.signup = async (req, res) => {
  let userId, userToken;
  try {
    const newUserData = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    };
    const snapshot = await db.doc(`/users/${newUserData.name}`).get();
    if (snapshot.exists) {
      res.status(400).json({ name: "This name is taken!" });
    } else {
      const result = await firebase
        .auth()
        .createUserWithEmailAndPassword(
          newUserData.email,
          newUserData.password
        );
      userId = result.user.uid;
      userToken = result.user.getIdToken();
      const userCredentials = {
        name: newUserData.name,
        email: newUserData.email,
        userId,
      };
      await db.doc(`/users/${newUserData.name}`).set(userCredentials);
      res.status(201).json({ token: `${userToken.i}` });
    }
  } catch (error) {
    console.log(error);
    if (error.code === "auth/email-already-in-use") {
      res.status(400).json({ email: "Email is already in use" });
    } else {
      res.status(500).json({ general: "something went wrong" });
    }
  }
};

//login
exports.login = async (req, res) => {
  try {
    let token;
    const userData = {
      email: req.body.email,
      password: req.body.password,
    };
    const result = await firebase
      .auth()
      .signInWithEmailAndPassword(userData.email, userData.password);
    token = await result.user.getIdToken();
    res.json({ token });
  } catch (error) {
    console.log(error);
    if (
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-user"
    ) {
      res.status(403).json({ error: "Wrong credentials" });
    } else {
      res.status(500).json({ error: "something went wrong" });
    }
  }
};

//get authenticated user
exports.getAuthenticatedUser = async (req, res) => {
  let userData = {};
  try {
    const returnedData = await db.doc(`/users/${req.user.name}`).get();
    if (returnedData.exists) {
      userData.credentials = returnedData.data();
    }
    return res.json(userData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.code });
  }
};

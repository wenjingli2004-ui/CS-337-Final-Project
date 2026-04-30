var express = require("express")
var session = require("express-session") 
var app = express()
var fs = require("fs")
var crypto = require("crypto")
var path = require("path")

var public_html = __dirname

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(session({
    secret: "shop",
    resave: false,
    saveUninitialized: false
}))

/**
 * Load users from users.json. 
 * 
 * @returns array of user objects, or empty array if function fails
 */
function loadUsers(){
    try{
        var content = fs.readFileSync("users.json",{"encoding":"utf-8"})
        return JSON.parse(content)
    }catch(err){
        console.log(err)
        return []
    }
}
var userList = loadUsers()

/**
 * Save current array into users.json. 
 */
function saveUsers(){
    fs.writeFileSync("users.json", JSON.stringify(userList, null, 2), {"encoding":"utf-8"})
}
/**
 * Gets the products
 */
function loadProducts(){
    try{
        var content = fs.readFileSync("products.json", {"encoding":"utf-8"})
        return JSON.parse(content)
    }catch(err){
        console.log(err)
        return []
    }
}
function saveProducts(products){
    fs.writeFileSync("products.json", JSON.stringify(products, null, 2), {"encoding": "utf-8"})
}
function getProducts(){
    var products = loadProducts();
    var prodStr = "";
    for (var i = 0; i<products.length; i++){
        var prod = products[i]
        var id = prod.productID
        var productName = prod.productName
        var emoji = prod.emoji
        var price = prod.price

        var p = `
            <div class="card" data-id="${id}">
                <div class="card-img">${emoji}</div>
                <div class="card-body">
                    <p>${productName}</p>
                    <p class="price">${price}</p>
                    <button onclick="addToCart('${id}', '${productName}', ${price})">Add to cart</button>
                </div>
            </div>
        `
        prodStr += p
    }
    return prodStr
}

/**
 * Finds user object through username. 
 * 
 * @param {*} username of user to find 
 * @returns user object if found, or null if not found 
 */
function findUser(username){
    // iterate over entire userList
    for (var i = 0; i < userList.length; i++) {
        // if usernames match, return user found
        if (userList[i].username == username) {
            return userList[i]
        }
    }
    return null
}

/**
 * Checks to see if login information are valid and exist.
 * 
 * @param {*} username of user
 * @param {*} password of user
 * @returns true if login information valid, otherwise, returns false 
 */
function checkLogin(username, password) {
    // attempt to find user 
    var user = findUser(username)
    if (!user) {
        return false
    }
    // if user found, create hashed password of user
    var hashedPass = crypto.createHash("sha256").update(password).digest("hex")

    if(user.password == hashedPass){
        return true
    }
    return false
}

/**
 * Checks to see if user is an admin. 
 * 
 * @param {*} username of user 
 * @returns true if user is admin, otherwise, returns false 
 */
function checkAdmin(username) {
    // attempt to find user
    var user = findUser(username)

    // if user type is admin
    if (user && user.usertype == "admin") {
        return true
    }
    return false
}

app.get("/", function(req, res){
    var productStr = getProducts();
    
    res.sendFile(path.join(public_html, "login.html"))
})

app.get("/login", function(req, res){
    res.sendFile(path.join(public_html, "login.html"))
})

app.get("/store", function(req, res){
    // if user not logged in, redirect to login page
    if (!req.session.user) {
        return res.redirect("/login")
    }
    var html = fs.readFileSync(path.join(public_html, "index.html"), {"encoding": "utf-8"})
    html = html.replace("<!--PRODUCTS-->", getProducts())
    res.send(html)
})

app.get("/create_user", function(req, res){
    res.sendFile(path.join(public_html, "userSignUp.html"))
})
/**
 * Creates the admin interface 
 */
app.get("/admin", function(req, res){
    if (!req.session.user){
        console.log("hmm")
    //     return res.redirect("/login")
    }
    res.sendFile(path.join(public_html, "admin.html"))
})
/**
 * Creates account for new user. 
 */
app.post("/signup", function(req, res){
    var username = req.body.username
    var password = req.body.password
    var usertype = req.body.usertype

    // ensure fields are non-empty 
    if (!username || !password || !usertype) {
        return res.status(400).send("Error: Username, password, or user type are empty.")
    }

    // ensure password length at least 8 chars 
    if (password.length < 8) {
        return res.status(400).send("Error: Password must be at least 8 characters long.")
    }

    // ensure username does not already exist
    if (findUser(username)){
        return res.status(400).send("Error: Username already exists.")
    }

    // create hashed password for user 
    var hashedPass = crypto.createHash("sha256").update(password).digest("hex")
    var id = crypto.randomUUID()

    // define user object 
    var userObj = {
        "userId": id,
        "username": username, 
        "password": hashedPass, 
        "usertype": usertype, 
        "cart": [] 
    }
    
    userList.push(userObj)

    saveUsers()

    console.log("User Id:", id, " created, user number: ", userList.length)
    
    res.redirect("/login")
})

/**
 * Logs in users. 
 */
app.post("/login", function(req, res){
    var username = req.body.username
    var password = req.body.password
    var userType = req.body.usertype

    if (checkLogin(username, password)) {
        // attempt to find user 
        var user = findUser(username)

        // if selected type does not match user's type, error
        if (user.usertype !== userType) {
            return res.status(403).send("Error: Wrong user type.")
        }

        // save user login information in current session 
        req.session.user = {
            "username": user.username,
            "usertype": user.usertype
        }
        // if user is admin
        if (user.usertype == "admin") {
            // send them to admin home
            res.sendFile(path.join(public_html, "admin.html"))

            console.log("hello")
            res.redirect("/admin")
            // res.sendFile(path.join(public_html, "admin.html"))
        // otherwise, send them to regular store 
        } else {
            res.redirect("/store")
        }
    } else {
        res.status(401).send("Error: Invalid username or password.")
    }
})

/**
 * Logs out users. 
 */
app.get("/logout", function(req, res){
    // clear user session 
    req.session.destroy(function(){
        res.redirect("/login")
    })
})

/**
 * Retrieves user's carts. 
 */
app.get("/cart", function(req, res){
    // ensure user is logged in 
    if(!req.session.user){
        return res.status(401).json({"error": "Error: User not logged in."})
    }
    // find username in session 
    var user = findUser(req.session.user.username)

    // if user not found, error 
    if (!user){
        return res.status(404).json({"error": "Error: User not Found."})
    }
    // ensure user has a cart 
    if(!user.cart){
        user.cart = []
        saveUsers()
    }
    res.json(user.cart)
})

/**
 * Handles adding products to user's cart. 
 */
app.post("/cart/add", function(req, res){
    // ensure user is logged in 
    if (!req.session.user) {
        return res.status(401).json({"error": "Error: User not logged in."})
    }
    // find username in session 
    var user = findUser(req.session.user.username)

    // if user not found, error 
    if (!user) {
        return res.status(404).json({"error": "Error: User not Found."})
    }
    // ensure user has a cart 
    if (!user.cart) {
        user.cart = []
    }

    // retrieve product information
    var productName = req.body.name
    var productPrice = Number(req.body.price)

    var found = false

    // iterate over user's products 
    for (var i = 0; i < user.cart.length; i++) {
        // if product exists, increment quantity 
        if (user.cart[i].name == productName) {
            user.cart[i].qty = user.cart[i].qty + 1
            found = true
        }
    }

    // if product not found, add to user cart 
    if (!found) {
        user.cart.push({
            "name": productName,
            "price": productPrice,
            "qty": 1
        })
    }
    saveUsers()
    res.json(user.cart)
})

/**
 * Handles removing products from user's cart. 
 */
app.post("/cart/remove", function(req, res){
    // ensure user is logged in 
    if (!req.session.user) {
        return res.status(401).json({"error": "Error: User not logged in."})
    }
    // find username in session 
    var user = findUser(req.session.user.username)

    // if user not found, error 
    if (!user) {
        return res.status(404).json({"error": "Error: User not Found."})
    }

    // ensure user has a cart 
    if (!user.cart) {
        user.cart = []
    }

    var productName = req.body.name

    // iterate over all products
    for (var i = 0; i < user.cart.length; i++) {
        // if product found, remove 
        if (user.cart[i].name == productName) { 
            user.cart.splice(i, 1)
            break
        }
    }

    saveUsers()

    res.json(user.cart)
})

/**
 * Handles clearing all products from user's cart. 
 */
app.post("/cart/clear", function(req, res){
    // ensure user is logged in 
    if (!req.session.user) {
        return res.status(401).json({"error": "Error: User not logged in."})
    }
    // find username in session 
    var user = findUser(req.session.user.username)

    // if user not found, error 
    if (!user) {
        return res.status(404).json({"error": "Error: User not Found."})
    }
    // clear user cart 
    user.cart = []

    saveUsers()

    res.json(user.cart)
})


/**
 * Displays page to manage products as admin. 
 */
app.post("/manage", function(req, res){
    // ensure session is also available 
    if (req.session.user && checkAdmin(req.session.user.username)) {
        res.sendFile(path.join(public_html, "manage.html"))
    } else {
        res.status(403).send("Error: Admin only")
    }
})

app.get("/products", function(req, res){
    var products = loadProducts()
    var result = products.map(function(p){
        return { id: p.productID, name: p.productName, emoji: p.emoji, price: p.price }
    })
    res.json(result)
})

app.post("/products/add", function(req, res){
    var name = req.body.name
    var price = req.body.price
    var emoji = req.body.emoji
    if (!name || !price || !emoji) {
        return res.status(400).json({ error: "Missing fields." })
    }
    var products = loadProducts()
    id = crypto.randomUUID
    products.push({ productID: crypto.randomUUID(), productName: name, emoji: emoji, price: price })
    saveProducts(products)
    var product = {
        "productID": id,
        "productName": name,
        "emoji": emoji,
        "price": price
    }
    products.push(product)
    saveProducts()
    console.log("Product Saved")
    var result = products.map(function(p){
        return { id: p.productID, name: p.productName, emoji: p.emoji, price: p.price }
    })

    res.json(result)
})

app.post("/products/delete", function(req, res){
    var name = req.body.name
    var products = loadProducts()
    products = products.filter(function(p){ return p.productName !== name })
    saveProducts(products)
    var result = products.map(function(p){
        return { id: p.productID, name: p.productName, emoji: p.emoji, price: p.price }
    })
    res.json(result)
})

app.listen(8080, function(){
    console.log("Server running at http://localhost:8080")
})
var express = require("express")
var app = express()
var fs = require("fs")
var crypto = require("crypto")
var path = require("path")

var public_html = path.join(__dirname, "public_html")

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

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
    res.sendFile(path.join(public_html, "login.html"))
})

app.get("/login", function(req, res){
    res.sendFile(path.join(public_html, "login.html"))
})

app.get("/store", function(req, res){
    res.sendFile(path.join(public_html, "index.html"))
})

app.get("/create_user", function(req, res){
    res.sendFile(path.join(public_html, "userSignUp.html"))
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

    if (checkLogin(username, password)) {
        // if user is admin
        if (checkAdmin(username)) {
            // send them to admin home 
            res.sendFile(path.join(public_html, "home_admin.html"))
        // otherwise, send them to regular store 
        } else {
            res.redirect("/store")
        }
    } else {
        res.status(401).send("Error: Invalid username or password.")
    }
})

/**
 * Displays page to manage products as admin. 
 */
app.post("/manage", function(req, res){
    if(checkAdmin(req.body.username)){
        res.sendFile(path.join(public_html, "manage.html"))
    } else {
        res.status(403).send("Error: Admin only")
    }
})

app.listen(8080, function(){
    console.log("Server running at http://localhost:8080")
})
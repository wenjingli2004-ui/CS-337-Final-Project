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

function checkLogin(username, password){
    for (var i = 0; i<userList.length; i++){
        var user = userList[i]
        var hashedPass = crypto.createHash("sha256").update(password).digest("hex")

        if(user.username == username && user.password == hashedPass){
            return true
        }
    }
    return false
}
function checkAdmin(username){
    for(var i = 0; i<userList.length; i++){
        var user = userList[i]
        if(user.username == username && user.usertype=="admin"){
            return true
        }
    }
    return false
}
app.get("/", function(req, res){
    res.sendFile(path.join(public_html, "index.html"))
})

// main page for both user and admin
// wenging work on the admin section
app.post("/home", function(req, res){
    if (checkAdmin(req.body.username)){
        // need to work on this
        res.sendFile(path.join(public_html, "home_admin.html"))
    }
    else{
        res.sendFile(path.join(public_html, "index.html"))
    }
})

// for creating user or user sign up
app.get("/create_user", function(req, res){
    res.sendFile(path.join(public_html, "userSignUp.html"))
})

// this is the add products we can remove this if worked on 
app.post("/manage", function(req, res){
    if(checkAdmin(req.body.username)){
        res.sendFile(path.join(public_html, "manage.html"))
    }
})

app.post("/signup", function(req, res){
    var hashedPass = crypto.createHash("sha256").update(req.body.password).digest("hex")
    var id = crypto.randomUUID();

    var userObj = {
        "userId": id,
        "username":req.body.username, 
        "password":hashedPass, 
        "usertype":req.body.usertype, 
        "cart": []
    }
    
    userList.push(userObj)

    saveUsers()

    console.log("User Id:", id, " created, user number: ", userList.length)
    
    res.sendFile(path.join(public_html, "created_notification.html"))
})

app.listen(8080, function(){
    console.log("Server running at http://localhost:8080")
})
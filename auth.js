module.exports = {
    isOwner:function(req, res){
        if(req.user) {
            return true;
        } else {
            return false;
        }
    },
    statusUI: function(req, res) {
        var authStatusUI = "Login";
        if (this.isOwner(req, res)) {
            authStatusUI = "Logout";
        }
        return authStatusUI
    }
}
//(c) Copyright 2023 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Group {

    constructor (data, patternPiece) {
        this.data = data;
        this.patternPiece = patternPiece;
        this.name = data.name;
        this.visible = data.visible;
        this.update = data.update;
        this.contextMenu = data.contextMenu;
        this.members = [];

        if ( this.data.member )
            this.data.member.forEach( function(m){
                var dObj = this.patternPiece.getObject( m, true );
                if ( dObj )
                {
                    this.members.push( dObj );
                    dObj.setIsMemberOfGroup( this );
                }     
            },this);
    }
}
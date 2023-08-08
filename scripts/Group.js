//(c) Copyright 2023 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Group {

    constructor (data, drawing) {
        this.data = data;
        this.drawing = drawing;
        this.name = data.name;
        this.visible = data.visible;
        this.update = data.update;
        this.contextMenu = data.contextMenu;
        this.showLength = data.showLength === "none" ? undefined : data.showLength; //line or label
        this.members = [];

        if ( this.data.member )
            this.data.member.forEach( function(m){
                var dObj = this.drawing.getObject( m, true );
                if ( dObj )
                {
                    this.members.push( dObj );
                    dObj.setIsMemberOfGroup( this );
                }     
            },this);
    }
}
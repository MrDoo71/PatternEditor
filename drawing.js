//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 

var scale;

class DrawingObject {

    constructor( data ) {
        this.data = data;
    }

    drawLabel( g, o )
    {   
        //g - the svg group we want to add the text to
        //o - the drawing object
    
        var d = o.data; //the original json data
    
        if ( typeof o.p.x !== "number" )
            return;

        g.append( "text")
         .attr("x", o.p.x + d.mx )
         .attr("y", o.p.y + d.my )
         .text( d.name )         
         //.attr("font-family", "sans-serif")
         .attr("font-size", ( 10 / scale ) +"px" )
         //.attr("fill", "black");    
    }

    drawDot( g, o ) {
        var d = o.data; //the original json data
        g.attr( "class", "j-point" );
        g.append( "circle" )
            .attr( "cx", o.p.x )
            .attr( "cy", o.p.y )
            .attr( "r", 4/scale );
        //.style( "fill", typeof d.color === "string" ? d.color : "black" ); 
    }

    pointEndLine( data ) {
        data.objectType = "pointEndLine";
        data.basePoint = this;
        return this.patternPiece.add( data );
    }
    
    pointAlongLine( data ) {
        data.objectType = "pointAlongLine";
        data.firstPoint = this;
        return this.patternPiece.add( data );
    }   

    lineTo( data ) {
        data.objectType = "line";
        data.firstPoint = this;
        return this.patternPiece.add( data );
    }    

    pointLineIntersect( data ) {
        data.objectType = "pointLineIntersect";
        data.p1Line1 = this;
        return this.patternPiece.add( data );
    }
}


class PointSingle extends DrawingObject{

    constructor( data ) {
        super( data );
        //this.data = data;
    }
    
    calculate( bounds )
    {
        var d = this.data;
        this.p = new GeoPoint( d.x, d.y );
        bounds.adjust( this.p );         
    }
    
    draw( g ) {
        //g is the svg group
        var d = this.data; //the original json data

        this.drawDot( g, this );
        this.drawLabel( g, this );       
    }
    
    html() {
        return '<span class="ps-name">' + this.data.name + '</span>:' + " point at x:" + this.data.x + ", y:" + this.data.y + " from origin";
    }    
}


class PointEndLine extends DrawingObject{

    constructor( data ) {
        super( data );
        //this.data = data;
    }

    calculate( bounds ) {
        var d = this.data;

        if ( typeof this.basePoint === "undefined" )
            this.basePoint = this.patternPiece.getObject( d.basePoint );   

        if ( typeof this.length === "undefined" )
            this.length = this.patternPiece.newFormula( d.length );   

        if ( typeof this.angle === "undefined" )
            this.angle = this.patternPiece.newFormula( d.angle );           
                                                                                //Convert degrees to radians
        this.p = this.basePoint.p.pointAtDistanceAndAngle( this.length.value(), Math.PI * 2 * this.angle.value() / 360 );
        this.line = new GeoLine( this.basePoint.p, this.p );
        
        bounds.adjustForLine( this.line );
    }
    
    draw( g ) {
        //g is the svg group
        var d = this.data;
                   
        g.append("line")
                .attr("x1", this.line.p1.x )
                .attr("y1", this.line.p1.y )
                .attr("x2", this.line.p2.x )
                .attr("y2", this.line.p2.y )
                .attr("stroke-width", 1/scale )
                .attr("stroke", "black");
       
        this.drawDot( g, this );     
        this.drawLabel( g, this );       
    }
    
    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.value() + " from " + this.basePoint.data.name + " angle:" + this.data.angle.value();
    }    
}


class PointAlongLine extends DrawingObject { 

    constructor( data ) {
        super( data );
        //this.data = data;
    }
    
    calculate( bounds )
    {
        var d = this.data;

        if ( typeof this.firstPoint === "undefined" )
            this.firstPoint = this.patternPiece.getObject( d.firstPoint );   

        if ( typeof this.secondPoint === "undefined" )
            this.secondPoint = this.patternPiece.getObject( d.secondPoint );   

        if ( typeof this.length === "undefined" )
            this.length = this.patternPiece.newFormula( d.length );   
        
        this.baseLine = new GeoLine( this.firstPoint.p, this.secondPoint.p );                        
        this.p = this.firstPoint.p.pointAtDistanceAndAngle( this.length.value( this.baseLine.length ), this.baseLine.angle );        
        this.line = new GeoLine( this.firstPoint.p, this.p );
        
        bounds.adjustForLine( this.line );
    }
    
    draw( g ) {
        var d = this.data;
                   
        g.append("line")
                .attr("x1", this.line.p1.x )
                .attr("y1", this.line.p1.y )
                .attr("x2", this.line.p2.x )
                .attr("y2", this.line.p2.y )
                .attr("stroke-width", 1/scale )
                .attr("stroke", "black");
       
        this.drawDot( g, this );     
        this.drawLabel( g, this );                  
    }
    
    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.html() + " along line from " + this.firstPoint.data.name + " to " + this.secondPoint.data.name;
    }        
}


class Line extends DrawingObject {

    constructor( data ) {
        super( data );
        //this.data = data;
    }
    
    calculate( bounds )
    {
        var d = this.data;

        if ( typeof this.firstPoint === "undefined" )
            this.firstPoint = this.patternPiece.getObject( d.firstPoint );   

        if ( typeof this.secondPoint === "undefined" )
            this.secondPoint = this.patternPiece.getObject( d.secondPoint );   

        this.line = new GeoLine( this.firstPoint.p, this.secondPoint.p );
        bounds.adjustForLine( this.line );
    }
    
    draw( g ) {
        var d = this.data;
                   
        g.append("line")
                .attr("x1", this.line.p1.x )   
                .attr("y1", this.line.p1.y )
                .attr("x2", this.line.p2.x )
                .attr("y2", this.line.p2.y )
                .attr("stroke-width", 1/scale )
                .attr("stroke", "black");
        
        //we could display the derived name Line_A1_A2 at the mid-point along the line?       
    }
    
    html() {
        return 'line ' + '<span class="ps-name">' + this.firstPoint.data.name + '</span>' + " - " + '<span class="ps-name">' + this.secondPoint.data.name + '</span>';
    }        
}


class PointLineIntersect extends DrawingObject {

    constructor ( data ) {
        super( data );
        //this.data = data;
    }
    
    calculate( bounds )
    {
        var d = this.data;

        if ( typeof this.p1Line1 === "undefined" )
            this.p1Line1 = this.patternPiece.getObject( d.p1Line1 );   

        if ( typeof this.p2Line1 === "undefined" )
            this.p2Line1 = this.patternPiece.getObject( d.p2Line1 );   

        if ( typeof this.p1Line2 === "undefined" )
            this.p1Line2 = this.patternPiece.getObject( d.p1Line2 );   

        if ( typeof this.p2Line2 === "undefined" )
            this.p2Line2 = this.patternPiece.getObject( d.p2Line2 );   
        
        this.line1 = new GeoLine( this.p1Line1.p, this.p2Line1.p );
        this.line2 = new GeoLine( this.p1Line2.p, this.p2Line2.p );        
        this.p = this.line1.intersect( this.line2 );        
        
        bounds.adjust( this.p );         
    }
    
    draw( g ) {
        //g is the svg group
        var d = this.data; //the original json data

        this.drawDot( g, this );            
        this.drawLabel( g, this );                
    }
            
    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: intersect ' + this.p1Line1.data.name + "-" + this.p2Line1.data.name + " with " + this.p1Line2.data.name + "-" + this.p2Line2.data.name;
    }                        
}

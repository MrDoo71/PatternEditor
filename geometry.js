//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 


//A point
class GeoPoint {

    //x;
    //y;

    constructor( x, y ) {
        this.x = x;
        this.y = y;
    }

    line( point2 ) {    
        return new GeoLine( this.x, this.y, point2.x, point2.y );
    }

    pointAtDistanceAndAngle( length, angle /*radians anti-clockwise from east*/ ) {        
        var x = this.x + length * Math.cos( -1 * angle ); //TODO this is a guess!
        var y = this.y + length * Math.sin( -1 * angle );   
        return new GeoPoint( x, y );
    }
}


//A line
class GeoLine {

    //p1;
    //p2;

    constructor( p1, p2 ) {
        this.p1 = p1;//new GeoPoint( x1, y1 );
        this.p2 = p2;//new GeoPoint( x2, y2 );
    
        this.deltaX = ( this.p2.x - this.p1.x ); //nb. +ve to the east from p1 to p2
        this.deltaY = ( this.p2.y - this.p1.y ); //nb +ve to the south from p1 to p2
    
        this.length = Math.sqrt( Math.pow(this.deltaX,2) + Math.pow(this.deltaY,2) );

        //angle is anti-clockwise starting east in radians
        this.angle = ( this.deltaX > this.deltaY ) ? Math.acos( this.deltaX / this.length )
                                               : Math.asin( -1 * this.deltaY / this.length ); //0 if deltaX==0
        if ( this.angle < 0 )
            this.angle = this.angle + (2 * Math.PI);          
    
        //alert( "Line angle:" + this.angle + " (" + ( this.angle / (2*Math.PI) * 360) + "deg anti clockwise from east" );
    
        this.slope  = ( this.deltaY / this.deltaX );
        this.offset = this.p1.y - ( this.p1.x * this.slope ); //the y values where x = 0; the intersection of the line with the y-axis
        //this line is generically: y = offset + ( x * slope )
    }

    intersect( line2 ) {    
        //intersection
        // offset - line2.offset / ( line2.slope - slope ) = x
        var x = this.offset - line2.offset / ( line2.slope - this.slope );
        var y = this.p1.y + ( this.slope * ( x - this.p1.x ) );
        return new GeoPoint(x,y);
    }    
}


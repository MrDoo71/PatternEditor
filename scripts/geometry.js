//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 

define(function (require) {
    require('kld-intersections');
});

const {Point2D, ShapeInfo, Intersection} = require("kld-intersections");

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

    asPoint2D()
    {
        return new Point2D( this.x, this.y );
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

    intersectArc( arc )
    {
        //var path = ShapeInfo.path("M40,70 Q50,150 90,90 T135,130 L160,70 C180,180 280,55 280,140 S400,110 290,100");
        var arcSI = arc.asShapeInfo();
        var lineSI = this.asShapeInfo();
        var intersections = Intersection.intersect(arcSI, lineSI);
        
        intersections.points.forEach(console.log);    
        return new GeoPoint( intersections.points[0].x, intersections.points[0].y );
    }

    asShapeInfo()
    {
        return ShapeInfo.line( this.p1.x, this.p1.y, this.p2.x, this.p2.y );
    }


    angleDeg() {
        var deltaX = (this.p2.x - this.p1.x);
        var deltaY = -1 * (this.p2.y - this.p1.y); //-1 because SVG has y going downwards

        if ( deltaX === 0 )
            return deltaY > 0 ? 90 : 270;

        return Math.atan( deltaY / deltaX ) * 180 / Math.PI;
    }
}


//A line
class GeoArc {

    //center
    //radius
    //amgle1
    //angle2

    constructor( center, radius, angle1, angle2 ) {
        this.center = center;
        this.radius = radius;
        this.angle1 = angle1;
        this.angle2 = angle2;
    }

    //TODO based on SVG book 
    centeredToSVG( cx, cy, rx, ry, theta/*arcStart*/, delta/*arcExtent*/, phi/*x axis rotation*/ )
    {
        var endTheta, phiRad;
        var x0, y0, x1, y1, largeArc, sweep;
        theta = theta * Math.PI / 180;
        endTheta = ( theta + delta ) * Math.PI / 180;
        phiRad = phi * Math.PI / 180;

        x0 = cx + Math.cos( phiRad ) * rx * Math.cos(theta) +
                  Math.sin( -phiRad ) * ry * Math.sin(theta);
    
        y0 = cy + Math.sin( phiRad ) * rx * Math.cos(theta) +
                  Math.cos( phiRad ) * ry * Math.sin(theta);
    
        x1 = cx + Math.cos( phiRad ) * rx * Math.cos(endTheta) +
                  Math.sin( -phiRad ) * ry * Math.sin(endTheta);
    
        y1 = cy + Math.sin( phiRad ) * rx * Math.cos(endTheta) +
                  Math.cos( phiRad ) * ry * Math.sin(endTheta);
    
        largeArc = ( delta > 180 ) ? 1 : 0;
        sweep = ( delta > 0 ) ? 1 : 0;
         
        return { x: x0,
                 y: y0,
                rx: rx,
                ry: ry,
                xAxisAngle: phi,
                largeArc: largeArc,
                sweep: sweep,
                x1: x1,
                y1: y1 };
    }    

    asShapeInfo()
    {        
        var angle1, angle2;
        if ( this.angle1 > this.angle2 )
        {
            angle1 = this.angle1;
            angle2 = this.angle2;
        }
        else
        {
            angle1 = this.angle2;
            angle2 = this.angle1;
        }
        //create(ShapeInfo.ARC, args, ["center", "radiusX", "radiusY", "startRadians", "endRadians"]);
        return ShapeInfo.arc( this.center.p.asPoint2D(), this.radius, this.radius, angle1 * Math.PI/180, angle2 * Math.PI/180 );
    }    
}



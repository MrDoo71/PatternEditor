//(c) Copyright 2019 Jason Dore
//
//This library collates the various geometric calclulation requirements
//of the drawing objects into a small number of primitives. 
//
//This library then generally uses other libraries to perform those 
//geometric calculations where they are non trivial
//(e.g. intersection of lines with splines).
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

//If making improvements also research:
//https://github.com/DmitryBaranovskiy/raphael/blob/v2.1.1/dev/raphael.core.js#L1837
//https://github.com/jarek-foksa/path-data-polyfill/blob/master/path-data-polyfill.js

import { Intersection, Point2D, ShapeInfo } from '../node_modules/kld-intersections/dist/index-esm.js';


//An arc of a circle
class GeoArc {

    //center
    //radius
    //angle1 - degrees!
    //angle2 - degrees!

    constructor( center, radius, angle1 /*deg*/, angle2 /*deg*/ ) {
        this.center = center;
        this.radius = radius;
        this.angle1 = angle1;
        this.angle2 = angle2;

        //Correct 180-0 to 180-360
        if ( this.angle2 < this.angle1 )
            this.angle2+=360;
    }

    //https://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes F.6.4 Conversion from center to endpoint parameterization
    //Hashed together from https://stackoverflow.com/questions/30277646/svg-convert-arcs-to-cubic-bezier and https://github.com/BigBadaboom/androidsvg/blob/5db71ef0007b41644258c1f139f941017aef7de3/androidsvg/src/main/java/com/caverock/androidsvg/utils/SVGAndroidRenderer.java#L2889
    asGeoSpline() {

        const angleStartRad = this.angle1 / 360.0 * 2.0 * Math.PI;
        const angleEndRad = this.angle2 / 360.0 * 2.0 * Math.PI;
        const angleExtentRad = angleEndRad - angleStartRad;
        const numSegments =  Math.ceil( Math.abs(angleExtentRad) * 2.0 / Math.PI); 
        const angleIncrement = angleExtentRad / numSegments;

        const controlLength = 4.0 / 3.0 * Math.sin(angleIncrement / 2.0) / (1.0 + Math.cos(angleIncrement / 2.0));

        const nodeData = [];

        let node = {};
        nodeData.push( node );

        for (let i=0; i<numSegments; i++)
        {
            let angle = angleStartRad + i * angleIncrement;
            let dx = Math.cos(angle) * this.radius;
            let dy = Math.sin(angle) * this.radius;

            if ( ! node.point )
                node.point = new GeoPoint( this.center.x + dx , this.center.y - dy );

            node.outControlPoint = new GeoPoint( this.center.x + dx - controlLength * dy, this.center.y - dy - controlLength * dx );

            angle += angleIncrement;
            dx = Math.cos(angle) * this.radius;
            dy = Math.sin(angle) * this.radius;

            node = {};
            nodeData.push( node );
            node.inControlPoint = new GeoPoint( this.center.x + dx + controlLength * dy, this.center.y - dy + controlLength * dx );
            node.point = new GeoPoint( this.center.x + dx, this.center.y - dy );
        }

        return new GeoSpline( nodeData );
    }


    splineBetweenPoints( previousP, nextP )
    {
        return this.asGeoSpline().splineBetweenPoints( previousP, nextP );
    }


    /**
     * Get the points on this arc where the tangents that go through
     * the specified point touch this arc.
     * 
     * @param {*} pointOnTangent 
     */
    getPointsOfTangent( pointOnTangent ) {
        //There is a right angle triangle where
        //hypotenous is the line tangent-arc.center - known length
        //lines tangent-p and p-center form a right angle.   p-center has length arc.radius
        //cos(i) = arc.radius / tangent-arc.center
        const radius  = this.radius;
        const h       = new GeoLine( this.center, pointOnTangent );
        const hLength = h.length;
        const angle   = Math.acos( radius/hLength ); //Would be an error if hLength < radius, as this means pointOnTangent is within the circle. 

        const tangentTouchPoints = [ this.center.pointAtDistanceAndAngleRad( radius, h.angle - angle ),
                                     this.center.pointAtDistanceAndAngleRad( radius, h.angle + angle ) ];        
        
        return tangentTouchPoints;
    }


    svgPath() {

        //TODO if this is a full circle we should really generate an svg circle rather than using a path

        const arcPath = d3.path();

        let a2 = this.angle2;

        if ( a2 < this.angle1 )
            a2 += 360;

        arcPath.arc( this.center.x, this.center.y, 
                    this.radius, 
                    -this.angle1 * Math.PI / 180, -a2 * Math.PI / 180, true );
             

                     //console.log( "Could have used d3:", arcPath.toString() );
        return arcPath.toString();

        //var a2 = this.angle2;
        //if ( this.angle2 < this.angle1 )
        //    a2 = a2 + 360;

        //THIS NOT WORKING
        //var svgParams = this.centeredToSVG( this.center.x, this.center.y, this.radius, this.radius, -this.angle1, a2-this.angle1, 0 );
        //var path = "M" + svgParams.x + "," + svgParams.y 
        //     + "A" + svgParams.rx + "," + svgParams.ry 
        //     + "," + svgParams.xAxisAngle + "," + svgParams.largeArc + "," + svgParams.sweep + ","
        //     + svgParams.x1 + "," + svgParams.y1 
        //
        //console.log( "svgPath() - ", path );

        //return path;
    }    

    
    pointAlongPath( length ) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        if ( length > path.getTotalLength() )
            length = path.getTotalLength();
        const p = path.getPointAtLength( length );
        return new GeoPoint( p.x, p.y );
    }        

    
    pointAlongPathFraction( fraction ) {

        if ( fraction == 0 )
        {
            return this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle1 );
        }

        if ( fraction == 1 )
        {
            return this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle2 );
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        const l = path.getTotalLength();
        const p = path.getPointAtLength( l * fraction );
        return new GeoPoint( p.x, p.y );
    }
    
    
    pathLength() {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             


    asShapeInfo() {  
        if (( this.angle1 == 0 ) && ( this.angle2 == 360 ))
            return ShapeInfo.circle( this.center.x, this.center.y, this.radius );

        //ShapeInfo angles seem to go clockwise from East, rather than our anti-clickwise angles
        let angle1 = 360-this.angle2;
        let angle2 = 360-this.angle1;

        if ( angle1 < 0 )
        {
            angle1 += 360;
            angle2 += 360;
        }

        //if ( angle2 < 0 )
        //    angle2 += 360;

        if ( angle2 < angle1 )
            angle2 += 360;

        //if ( angle2 > 360 ) //the original angle1 was negative. 
        //{
        //    angle1 -= 360;
        //    angle2 -= 360;
        //}

        //if ( angle1 < 0 )
        //angle1 = 0;

        //if ( angle2 < 0 )
        //angle2 = 0;

       // if ( angle2 < angle1 )
       // {
       //     var t = angle2;
       //     angle2 = angle1;
       //     angle1 = t;
       // }
                
        return ShapeInfo.arc( this.center.x, this.center.y, this.radius, this.radius, angle1 * Math.PI/180, angle2 * Math.PI/180 );
    }    


    applyOperation( pointTransformer ) {//apply a operationFlip or operationRotate to this GeoArc
        const center2 = pointTransformer( this.center );

        //s = the point on the arc that we start drawing
        const s = this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle1 );
        const s2 = pointTransformer( s );
        const s2line = new GeoLine( center2, s2 );
        const startAngle2 = s2line.angleDeg();

        //f = the point on the arc that we finish drawing
        const f = this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle2 );
        const f2 = pointTransformer( f );
        const f2line = new GeoLine( center2, f2 );
        const finishAngle2 = f2line.angleDeg();

        //Because we've flipped the start angle becomes the finish angle and vice verasa.
        return new GeoArc(  center2, this.radius, finishAngle2 /*deg*/, startAngle2 /*deg*/  );
    }


    adjustBounds( bounds ) {

        //An arc, between 70, and 100 degrees would be bounded by the start and stop
        //points and the point at 90 degrees. 
        var startPoint = this.pointAlongPathFraction(0);
        var endPoint = this.pointAlongPathFraction(0);
        bounds.adjust( startPoint );
        bounds.adjust( endPoint );

        if (( this.angle1 < 90 ) && ( this.angle2 > 90 ))        
            bounds.adjustToIncludeXY( this.center.x, this.center.y - this.radius ); //add N

        if (( this.angle1 < 180 ) && ( this.angle2 > 180 ))        
            bounds.adjustToIncludeXY( this.center.x - this.radius, this.center.y ); //add W

        if (( this.angle1 < 270 ) && ( this.angle2 > 270 ))        
            bounds.adjustToIncludeXY( this.center.x, this.center.y + this.radius ); //add S

        if (( this.angle1 < 360 ) && ( this.angle2 > 360 ))        
            bounds.adjustToIncludeXY( this.center.x + this.radius, this.center.y ); //add E
    }
}



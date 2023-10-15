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

//A line
class GeoLine {

    //p1;
    //p2;

    constructor( p1, p2 ) {

        if ( ! p1 )
            throw "GeoLine p1 not defined.";

        if ( ! p2 )
            throw "GeoLine p2 not defined.";

        this.p1 = p1;
        this.p2 = p2;
    
        this.deltaX = ( this.p2.x - this.p1.x ); //nb. +ve to the east from p1 to p2
        this.deltaY = ( this.p2.y - this.p1.y ); //nb +ve to the south from p1 to p2
    
        this.length = Math.sqrt( Math.pow(this.deltaX,2) + Math.pow(this.deltaY,2) );

        //angle is anti-clockwise starting east in radians
        this.angle = Math.atan2( -this.deltaY, this.deltaX );

        if ( this.angle < 0 )
            this.angle = this.angle + (2 * Math.PI);          
    
        this.slope  = ( this.deltaY / this.deltaX );
        this.offset = this.p1.y - ( this.p1.x * this.slope ); //the y values where x = 0; the intersection of the line with the y-axis
        //this line is generically: y = offset + ( x * slope )
    }

    //Return a GeoPoint for the intersection of this line with line2. 
    intersect( line2 ) {    
        //intersection
        //  // offset - line2.offset / ( line2.slope - slope ) = x

        const swap = Math.abs( this.deltaX ) > Math.abs( line2.deltaX );
        const line1s = swap ? this : line2;
        const line2s = swap ? line2 : this;

        let x, y;

        if (    ( line2s.slope === Infinity ) 
             || ( line2s.slope === -Infinity )  )
            x = line2s.p1.x;
        else
            x = ( line1s.offset - line2s.offset ) / ( line2s.slope - line1s.slope );

        if ( line1s.slope === 0 )
            y = line1s.p1.y;
        else
            y = line1s.p1.y + ( line1s.slope * ( x - line1s.p1.x ) );

        return new GeoPoint(x,y);

        //Using the Intersection libary requires that the finite lines intersect, rather than
        //their infinite versions. 
        //var line1SI = this.asShapeInfo();
        //var line2SI = line2.asShapeInfo();
        //var intersections = Intersection.intersect(line1SI, line2SI);        
        //intersections.points.forEach(console.log);    
        //return new GeoPoint( intersections.points[0].x, intersections.points[0].y );
    }    


    //Return a GeoPoint for where this line intersects the specified GeoArc, GeoEllipticalArc, or GeoSpline.
    intersectArc( arc, alreadyTweaked ) { 
        //work around a bug where the arc spans 0 deg
        if (    ( arc instanceof GeoArc )
             && ( arc.angle1 < 0 ) 
             && ( arc.angle2 > 0 ) 
              ) //not an elliptical
        {
            try { 
                const arc1 = new GeoArc( arc.center, arc.radius, 0, arc.angle2 );
                return this.intersectArc( arc1 );
            } catch ( e ) {
                const arc2 = new GeoArc( arc.center, arc.radius, arc.angle1 + 360, 360 );
                return this.intersectArc( arc2 );
            }
        }
        if (    ( arc.angle1 < 360 ) 
             && ( arc.angle2 > 360 ) 
             && ( arc instanceof GeoArc ) ) //not an elliptical
        {
            try { 
                const arc1 = new GeoArc( arc.center, arc.radius, 0, arc.angle2 -360 );
                return this.intersectArc( arc1 );
            } catch ( e ) {
                const arc2 = new GeoArc( arc.center, arc.radius, arc.angle1, 360 );
                return this.intersectArc( arc2 );
            }
        }

        let arcSI,lineSI;

        //nb there is a special case for GeoEllipticalArc where this.p1 == arc.center in 
        //which case a simple formula gives the intersect.

        if (( arc instanceof GeoEllipticalArc ) && ( arc.rotationAngle !== 0 ))
        {            
            //console.log("elliptical arc ");
            
            //create an equivalent arc that is not rotated.
            //create a new line, rotate the startpoint by -rotationAngle, the new lines angle should also be less by -rotationAngle
            //finally rotate the intersect point back
            const nrArc = new GeoEllipticalArc( arc.center,
                                              arc.radius1,
                                              arc.radius2, 
                                              arc.angle1, 
                                              arc.angle2,
                                              0 );
            const p1rotated = this.p1.rotate( arc.center, -arc.rotationAngle );
            const bounds = new Bounds();
            bounds.adjust( p1rotated );
            arc.adjustBounds( bounds );
            const maxLineLength = bounds.diagonaglLength() * 1.25;
            const lineRotated = new GeoLine( p1rotated, p1rotated.pointAtDistanceAndAngleDeg( maxLineLength/*infinite*/, (this.angleDeg() - arc.rotationAngle) ) );
            lineSI = lineRotated.asShapeInfo();
            arcSI = nrArc.asShapeInfo();
        }
        else
        {
            const bounds = new Bounds();
            bounds.adjust( this.p1 );
            arc.adjustBounds( bounds );
            const maxLineLength = bounds.diagonaglLength() * 1.25;
            
            //This should be sufficient, extend our line forward enough that it should intersect...
            //Ensure that the line is long enough to intersect. 
            const extendedLine = new GeoLine( this.p1, this.p1.pointAtDistanceAndAngleRad( maxLineLength, this.angle ));  

            arcSI = arc.asShapeInfo();
            lineSI = extendedLine.asShapeInfo();    
        }
    
        let intersections = Intersection.intersect(arcSI, lineSI);
        
        if ( intersections.points.length === 0 )
        { 
            if ( ! alreadyTweaked )
            {
                //console.log( "Failed for angle ", this.angle );
                //console.log( "PI:", this.angle/Math.PI );
                const lineTweaked = new GeoLine( this.p1, this.p1.pointAtDistanceAndAngleRad( this.length, this.angle + (Math.PI/180 * 0.00000001) )); //Adding a billionth of a degree fixes the broken intersection issue.

                try {
                    //This should be no different, but sometimes this works when arc-line intersect fails
                    return lineTweaked.intersectArc( arc, true );
                } catch ( e ) {
                    //There still appears to be a bug in arc intersection. 
                    if (( arc instanceof GeoArc ) || ( arc instanceof GeoEllipticalArc ))
                    {
                        const arcAsSpline = arc.asGeoSpline();
                        return this.intersectArc( arcAsSpline );
                    }
                    else
                        throw e;
                }
            }
            throw "No intersection with arc. ";
        }

        let whichPoint = 0;
        if ( intersections.points.length > 1 )//-1;//0; //0 for G1 in headpattern. //intersections.points.length -1; //TODO do this properly
        {            
            //choose the first point we get to along the line. 
            let smallestDistance;
            for (const i in intersections.points ) 
            {
                const pi = intersections.points[i];
                const p1pi = new GeoLine( this.p1, pi );
                
                if (    ( smallestDistance === undefined ) 
                        || (    ( Math.abs( p1pi.angle - this.angle ) < 0.0001 ) //rather than 180 deg the other way (allowing for rounding errors)
                            && ( p1pi.length < smallestDistance ) ) )
                {
                    smallestDistance = p1pi.length;
                    whichPoint = i;
                }
            }
        }

        let intersect = new GeoPoint( intersections.points[whichPoint].x, intersections.points[whichPoint].y );

        if (( arc instanceof GeoEllipticalArc ) && ( arc.rotationAngle !== 0 ))
        {
            intersect = intersect.rotate( arc.center, +arc.rotationAngle );
        }

        return intersect;
    }


    //Return a GeoLine having applied the operationFlip or operationRotate to this GeoLine.
    applyOperation( pointTransformer ) {
        const p1Transformed = pointTransformer( this.p1 );
        const p2Transformed =  pointTransformer( this.p2 );
        return new GeoLine( p1Transformed, p2Transformed );
    }    


    asShapeInfo() {
        return ShapeInfo.line( this.p1.x, this.p1.y, this.p2.x, this.p2.y );
    }


    svgPath() 
    {
        return "M" + this.p1.x + "," + this.p1.y + " " +
               "L" + this.p2.x + "," + this.p2.y + " ";
    }


    angleDeg() {

       return this.angle * 180 / Math.PI;
    }


    angleRad() {
        return this.angle;
    }


    getLength() {
        return this.length;
    }


    pointAlongPathFraction( fraction ) {
        if ( fraction == 0 )
            return this.p1;

        if ( fraction == 100 )
            return this.p2;

        return new GeoPoint( ( this.p2.x - this.p1.x ) * fraction + this.p1.x,
                             ( this.p2.y - this.p1.y ) * fraction + this.p1.y );
    }
}


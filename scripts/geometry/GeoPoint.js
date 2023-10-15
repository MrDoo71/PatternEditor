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


//A point
class GeoPoint {

    constructor( x, y ) {
        this.x = x;
        this.y = y;

        if ( isNaN( this.x ) )
            throw "GeoPoint x not a number.";
            
        if ( isNaN( this.y ) )
            throw "GeoPoint y not a number.";
    }

    
    line( point2 ) {    
        throw "this looks broken, two params, not four";
        return new GeoLine( this.x, this.y, point2.x, point2.y );
    }


    pointAtDistanceAndAngleRad( length, angle /*radians anti-clockwise from east*/ ) {        
        const x = this.x + length * Math.cos( -1 * angle ); //TODO this is a guess!
        const y = this.y + length * Math.sin( -1 * angle );   
        return new GeoPoint( x, y );
    }


    pointAtDistanceAndAngleDeg( length, angle /*deg anti-clockwise from east*/ ) {        
        return this.pointAtDistanceAndAngleRad( length, angle * Math.PI / 180 );
    }


    rotate( center, rotateAngleDeg ) {
        //Convert degrees to radians
        
        const centerToSourceLine = new GeoLine( center, this );
        const distance = centerToSourceLine.getLength();
        const angle = centerToSourceLine.angleDeg() + rotateAngleDeg;

        const result = center.pointAtDistanceAndAngleDeg( distance, angle );
        return result;
    }


    asPoint2D() {
        return new Point2D( this.x, this.y );
    }


    equals( p )
    {
        if ( p === this )
            return true;

        if ( this.x === p.x && this.y === p.y )
            return true;

        const dx = Math.abs( this.x - p.x );
        const dy = Math.abs( this.y - p.y );
        
        if (( dx < 0.01 ) && ( dy < 0.01 ))
        {
            if (( dx < 0.001 ) && ( dy < 0.001 ))
            {
                //console.warn("EQUALS - CLOSE! " + Math.max( dx, dy ) + " MATCHED");
                return true;
            }
            //else
            //    console.warn("EQUALS - CLOSE! " + Math.max( dx, dy ) + " X");
        }

        return this.x === p.x && this.y === p.y;
    }


    toString()
    {
        return "(" + Math.round(this.x*100)/100 + "," + Math.round(this.y*100)/100 + ")";
    }
}


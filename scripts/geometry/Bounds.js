//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Bounds {
    
    constructor() {
        this.minX = undefined;
        this.maxX = undefined;
        this.minY = undefined;
        this.maxY = undefined;
    }

    adjust(p) {

        if (!p)
            return; //e.g. an error

        this.adjustToIncludeXY( p.x, p.y );
    }

    adjustToIncludeXY( x, y ) {

        if (x !== undefined) {
            if ((this.minX === undefined) || (x < this.minX))
                this.minX = x;
            if ((this.maxX === undefined) || (x > this.maxX))
                this.maxX = x;
        }

        if (y !== undefined) {
            if ((this.minY === undefined) || (y < this.minY))
                this.minY = y;
            if ((this.maxY === undefined) || (y > this.maxY))
                this.maxY = y;
        }

        if ( this.parent )
            this.parent.adjustToIncludeXY( x,y );
    }

    adjustForLine(line) {

        if (!line)
            return;

        this.adjust(line.p1);
        this.adjust(line.p2);
    }

    diagonaglLength() {

        var deltaX = ( this.maxX - this.minX );
        var deltaY = ( this.maxY - this.minY );
    
        return Math.sqrt( Math.pow(deltaX,2) + Math.pow(deltaY,2) );
    }

    
    /**
     * Return true if these bounds contain the point, false if the point
     * is outside these bounds. 
     * 
     * @param {*} p 
     */
    containsPoint( p, tolerance )
    {
        tolerance = tolerance === undefined ? 0 : tolerance;
        return    ( p.x >= ( this.minX - tolerance ) )
               && ( p.x <= ( this.maxX + tolerance ) )
               && ( p.y >= ( this.minY - tolerance ) )
               && ( p.y <= ( this.maxY + tolerance ) );
    }
}



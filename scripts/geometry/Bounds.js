//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Bounds {
    
    constructor() {
        this.minX = undefined;
        this.maxX = undefined;
        this.minY = undefined;
        this.maxY = undefined;
    }

    //offset is optinoal
    adjust( p, offset ) {

        if (!p)
            return; //e.g. an error

        const mx = offset?.mx;
        const my = offset?.my;
        this.adjustToIncludeXY( p.x + ( mx !== undefined ? mx : 0 ) , p.y + ( my !== undefined ? my : 0 ) );
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

    adjustForLine(line, offset) {

        if (!line)
            return;

        this.adjust(line.p1, offset);
        this.adjust(line.p2, offset);
    }

    diagonaglLength() {

        const deltaX = ( this.maxX - this.minX );
        const deltaY = ( this.maxY - this.minY );
    
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



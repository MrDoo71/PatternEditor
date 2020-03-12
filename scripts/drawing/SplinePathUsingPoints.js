/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class SplinePathUsingPoints extends DrawingObject {

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        var d = this.data;

        if ( typeof this.nodes === "undefined" )
        {
            this.nodes = [];

            for( var i=0; i< d.pathNode.length; i++ )
            {
                this.data.pathNode[i].point = this.patternPiece.getObject( this.data.pathNode[i].point );
            }

            for( var i=0; i< d.pathNode.length; i+=3 )
            {
                this.nodes.push( { 
                                   inControlPoint:   (i-1)>0 ? this.data.pathNode[i-1].point.p : undefined,
                                   point:            this.data.pathNode[i].point.p,
                                   outControlPoint:  (i+1) < this.data.pathNode.length ? this.data.pathNode[i+1].point.p : undefined,
                                   } );
            }
        }

        this.curve = new GeoSpline( this.nodes );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;
        bounds.adjust( this.p );

        //Bounds will already have been adjusted for each node
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw( g, isOutline ) {
        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), isOutline );

        //Where should we draw the label? half way along the curve? 
        this.drawLabel( g, isOutline );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        var html = '<span class="ps-name">' + this.data.name + '</span>: '
                + 'curved path: ';

        var d = this.data;

        for( var i=0; i< d.pathNode.length; i+=3 )
        {
            if ( (i-1)>0 )
                html += this.refOf( this.data.pathNode[i-1].point );
                //html += '<span class="control-point">' + this.data.pathNode[i-1].point.ref() + '</span> ';

            html += d.pathNode[i].point.ref() + " ";            

            if ( (i+1) < this.data.pathNode.length )
                html += this.refOf(  this.data.pathNode[i+1].point );
                //html += '<span class="control-point">' + this.data.pathNode[i+1].point.ref() + '</span> ';
        }

        return html;
    }

    
    setDependencies( dependencies )
    {
        for( var i=0; i< this.data.pathNode.length; i++ )
        {
            dependencies.add( this, this.data.pathNode[i].point );
        }        
    }    
}

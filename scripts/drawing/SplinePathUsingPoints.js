

class SplinePathUsingPoints extends DrawingObject {

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        const d = this.data;

        if ( typeof this.nodes === "undefined" )
        {
            this.nodes = [];

            for( const pathNode of d.pathNode )
            {
                pathNode.point = this.drawing.getObject( pathNode.point );
            }

            for( let i=0; i< d.pathNode.length; i+=3 )
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
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust( this.p );

        //Bounds will already have been adjusted for each node
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw( g, drawOptions ) {
        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), drawOptions );

        //Where should we draw the label? half way along the curve? 
        this.drawLabel( g, drawOptions );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        let html = this.nameOf() + ': '
                   + 'curved path: ';

        const d = this.data;

        html += "<table><tbody>";

        for( let i=0; i< d.pathNode.length; i+=3 )
        {
            html += "<tr><td>";

            if ( (i-1)>0 )
                html += this.refOf( this.data.pathNode[i-1].point );

            html += "</td><td>";

            html += this.refOf( d.pathNode[i].point );

            html += "</td><td>";

            if ( (i+1) < this.data.pathNode.length )
                html += this.refOf(  this.data.pathNode[i+1].point );

            html += "</td></tr>";                
        }

        html += "</tbody></table>";

        return html;
    }

    
    setDependencies( dependencies )
    {
        for( const n of this.data.pathNode )
        {
            dependencies.add( this, n.point );
        }        
    }    
}

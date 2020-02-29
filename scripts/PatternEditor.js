//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 

var selectedObject;
var linksGroup;
var fontsSizedForScale = 1;
var fontResizeTimer;

function drawPattern( dataAndConfig, ptarget, options ) 
{
    //Remove the svg if called by graph_kill
    if ( dataAndConfig === null )
    {
        var parent = document.getElementById(ptarget).parentNode;
        var child = document.getElementById(ptarget);
        parent.removeChild(child);
        return ;
    } 

    //This is a graph initialisation

    var pattern = new Pattern( dataAndConfig, options );
      
    //pattern.gInteractionPrefix = options.interactionPrefix;    
    
    function newkvpSet(noRefresh)
    {
        var kvp = { } ;
        kvp.kvps = new Array() ;

        kvp.add = function (k, v)
        {
            this.kvps.push ( {k: k, v: v} ) ;
        } ;

        kvp.toString = function (p)
        {
            var r = '' ;

            for (var i = 0 ; i < this.kvps.length ; i++)
            {
                r += '&' + p + this.kvps[i].k + '=' + this.kvps[i].v ;
            }

            return r ;
        } ;

        if (noRefresh)
            kvp.add("_noRefresh", -1) ;

        return kvp ;
    }
    
    // show menu on right-click.
    var contextMenu = function(d) {
   		d3.event.preventDefault() ;
    	var v = newkvpSet(false) ;
    	v.add("x", d.x) ;   
    	v.add("y", d.y) ;    
    	goGraph( options.interactionPrefix + ':' + d.data.contextMenu ,
    			 d3.event, 
    			 v ) ;
    }      
    
    var targetdiv = d3.select( "#" + ptarget )
                       .append( "div" )
                       .attr( "class", "pattern-editor" );

    if ( ! dataAndConfig.options )
        dataAndConfig.options = {};

    if ( dataAndConfig.options.allowPanAndZoom === undefined )
        dataAndConfig.options.allowPanAndZoom = true;

    if ( dataAndConfig.options.showFormulas === undefined )
        dataAndConfig.options.showFormulas = true;

    if ( ! dataAndConfig.options.viewOption )
        dataAndConfig.options.viewOption = [{ "label": "2:2", "drawingWidth": 6, "descriptionsWidth": 6 }];

    dataAndConfig.options.layoutConfig = { drawingWidth: 400,
                                           drawingHeight: 600,
                                           drawingMargin: 0,//25,
                                           tableWidth: 400,
                                           tableHeight: 600,
                                           tableMargin: 0 };//25 };

    dataAndConfig.options.setButton = function( viewOption ) {

        if ( ! viewOption )
           viewOption = this.layoutConfig.viewOption;

        var totalWidth = viewOption.drawingWidth + viewOption.descriptionsWidth; //should be tableWidth
        var availableWidth = targetdiv.style('width').slice(0, -2) -30;// 1000;
        var availableHeight= window.innerHeight - targetdiv.node().getBoundingClientRect().top -60/*controlpanel buttons height nad margin*/;
        this.layoutConfig.drawingWidth = availableWidth * viewOption.drawingWidth / totalWidth;
        this.layoutConfig.tableWidth   = availableWidth * viewOption.descriptionsWidth / totalWidth;
        this.layoutConfig.drawingHeight = availableHeight;
        this.layoutConfig.tableHeight = availableHeight;
        this.layoutConfig.viewOption = viewOption; //so we can call this without a parameter when toggling full size. 
    };    

    dataAndConfig.options.setButton( dataAndConfig.options.viewOption[ dataAndConfig.options.defaultViewOption ? dataAndConfig.options.defaultViewOption : 0 ] );

    var focusDrawingObject = function( d, scrollTable )
    {
        selectedObject = d;

        if (( d3.event) && ( d3.event.originalTarget.className === "ps-ref" ))
        {
            selectedObject = d.patternPiece.getObject( d3.event.originalTarget.innerHTML );
            scrollTable = true;
        }

        for( var i=0; i< pattern.patternPiece1.drawingObjects.length; i++ )
        {
            var a = pattern.patternPiece1.drawingObjects[i];
            var g = a.drawingSvg;
            var strokeWidth = a.getStrokeWidth( false, (selectedObject==a) );
            g.selectAll( "line" )
              .attr("stroke-width", strokeWidth );
            g.selectAll( "path" )
              .attr("stroke-width", strokeWidth );
        }        

        var graphdiv = targetdiv;
        //Remove any existing highlighting in the table. 
        $(graphdiv.node()).find( ".j-active" ).removeClass("j-active");
        $(graphdiv.node()).find( ".source" ).removeClass("source");
        $(graphdiv.node()).find( ".target" ).removeClass("target");
        //$(graphdiv.node()).find( ".j-outline.j-outline-active" ).removeClass("j-outline-active");
        //$(this).addClass("j-active"); //highlight the object in the drawing

        //d, the drawing object we clicked on, has a direct reference to its representation in the table
        selectedObject.tableSvg.node().classList.add("j-active");

        if ( selectedObject.drawingSvg )
            selectedObject.drawingSvg.node().classList.add("j-active");

        if ( selectedObject.outlineSvg )
            selectedObject.outlineSvg.node().classList.add("j-active");

        //Set the css class of all links to "link" "source link" or "target link" as appropriate.
        linksGroup.selectAll("path.link") //rename .link to .dependency
            .attr("class", function( d ) {                         
                if ( d.source == selectedObject ) 
                {
                    d.target.tableSvg.node().classList.add("source");
                    d.target.outlineSvg.node().classList.add("source");
                    //d.target.tableSvg.each( function() { $(this).addClass("source"); } );
                    return "source link";
                }
                if ( d.target == selectedObject ) 
                {
                    d.source.tableSvg.node().classList.add("target");
                    d.source.outlineSvg.node().classList.add("target");
                    //d.source.tableSvg.each( function() { $(this).addClass("target"); } );
                    return "target link";
                }
                return "link"; 
            } )
            .each( function( d ) { 
                if (( selectedObject.source == selectedObject ) || ( selectedObject.target == selectedObject ))
                    d3.select(this).raise();
             } );

        //Scroll the table to ensure that d.tableSvg is in view.    
        if ( scrollTable )
        {
            var table = d3.select("div.pattern-table");
            table.transition().duration(500)
            .tween("uniquetweenname", scrollTopTween( selectedObject.tableSvg.node().__data__.tableSvgY - ( table.node().getBoundingClientRect().height /2) ));
        }
    };

    var doDrawingAndTable = function() {
                                    if ( dataAndConfig.options.layoutConfig.drawingWidth )
                                        doDrawing( targetdiv, pattern.patternPiece1, dataAndConfig.options, contextMenu, focusDrawingObject );
                                    else
                                        targetdiv.select("svg.pattern-drawing").remove();

                                    if ( dataAndConfig.options.layoutConfig.tableWidth )
                                        doTable( targetdiv, pattern.patternPiece1, dataAndConfig.options, contextMenu, focusDrawingObject );
                                    else
                                        targetdiv.select("div.pattern-table").remove();
                                };

    doControls( targetdiv, dataAndConfig.options, doDrawingAndTable );
    doDrawingAndTable();                   
    
    for( var i=0; i< pattern.patternPiece1.drawingObjects.length; i++ )
    {
        var a = pattern.patternPiece1.drawingObjects[i];
        if ( a.error )
        {
            focusDrawingObject(a, true);
            break;
        }
    }

}


function doControls( graphdiv, editorOptions, doDrawingAndTable )
{
    if ( ! editorOptions )
        return;

    var controls = graphdiv.append("div").attr("class", "pattern-editor-controls")

    if (    ( editorOptions.viewOption )
         && ( editorOptions.viewOption.length > 1 ) )
    {
        var sizeButtons = controls.append("div").attr("class", "btn-group view-options");
        sizeButtons.selectAll("button")
                    .data( editorOptions.viewOption )
                    .enter()
                    .append("button")
                    .attr( "class", "btn btn-default" )
                    .text(function(d) { return d.label; })
                    .on("click", function(d) {
                        d3.event.preventDefault();
                        editorOptions.setButton( d );
                        doDrawingAndTable();
                        //d3.event.stopPropagation();
                    } );
    }

    if ( editorOptions.includeFullPageOption )
    {
        var toggleFullScreen = function() {
            d3.event.preventDefault();

            if ( graphdiv.classed("full-page") ) 
                graphdiv.node().classList.remove("full-page");
            else
                graphdiv.node().classList.add("full-page");

            editorOptions.setButton();
            doDrawingAndTable();
        };

        var fullPageButton = controls.append("button")
                                     .attr("class", "btn btn-default toggle-full-page")
                                     .text( "full" )
                                     .on("click", toggleFullScreen );
    }

    //if ( editorOptions.includeFullPageOption )
    {
        var toggleShowFormulas = function() {
            d3.event.preventDefault();
            editorOptions.showFormulas = ! editorOptions.showFormulas;
            d3.select(this).text( editorOptions.showFormulas ? "hide formulas" : "show formulas" );
            doDrawingAndTable();
        };

        var toggleShowFormulas = controls.append("button")
                                     .attr("class", "btn btn-default toggle-show_formulas")
                                     .text( editorOptions.showFormulas ? "hide formulas" : "show formulas" )
                                     .on("click", toggleShowFormulas );
    }    
}



//http://bl.ocks.org/humbletim/5507619
function scrollTopTween(scrollTop) 
{
    return function() {
        var i = d3.interpolateNumber(this.scrollTop, scrollTop);
        //console.log( "function1: ", this.scrollTop, " - ", scrollTop );
        return function(t) { 
            this.scrollTop = i(t); 
            //console.log( "function2: ", this.scrollTop );
        };
    }
}
  

//Do the drawing... (we've added draw() to each drawing object.
function doDrawing( graphdiv, patternPiece1, editorOptions, contextMenu, focusDrawingObject )
{
    var layoutConfig = editorOptions.layoutConfig;
    var margin = layoutConfig.drawingMargin;//25;    ///XXX why a margin at all?
    var width =  layoutConfig.drawingWidth;//400;
    var height = layoutConfig.drawingHeight;//600;

    graphdiv.select("svg.pattern-drawing").remove();

    var svg = graphdiv.append("svg")
                       .attr("class", "pattern-drawing" )
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

    var transformGroup1 = svg.append("g")
                            .attr("transform", "translate(" + ( margin ) + "," + ( margin ) + ")");

    var scaleX = width / ( patternPiece1.bounds.maxX - patternPiece1.bounds.minX );                   
    var scaleY = height / ( patternPiece1.bounds.maxY - patternPiece1.bounds.minY );           
    
    if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
        scale = scaleX > scaleY ? scaleY : scaleX;
    else if ( isFinite( scaleX ) )
        scale = scaleX;
    else
        scale = 1;

    var transformGroup2 = transformGroup1.append("g")
                               .attr("transform", "scale(" + scale + "," + scale + ")");

    //centralise horizontally                            
    var boundsWidth = patternPiece1.bounds.maxX - patternPiece1.bounds.minX;
    var availableWidth = width / scale;
    var offSetX = ( availableWidth - boundsWidth ) /2;

    var transformGroup3 = transformGroup2.append("g")
                               .attr("transform", "translate(" + ( ( -1.0 * ( patternPiece1.bounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * patternPiece1.bounds.minY ) ) + ")");    

    //Clicking on an object in the drawing should highlight it in the table.
    var onclick = function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,true);
    };

    var outlineGroup = transformGroup3.append("g");
    var drawingGroup = transformGroup3.append("g");

    var a = drawingGroup.selectAll("g");    
    a = a.data( patternPiece1.drawingObjects );
    a.enter()
     .append("g")
     //.attr("class", "j-point")
     .each( function(d,i) {
        var g = d3.select( this );

        d.drawingSvg = g;
        
        g.on("contextmenu", contextMenu)
         .on("click", onclick)
         .attr("class", "j-point");
        
        if (( typeof d.draw === "function" ) && ( ! d.error ))
        {
            d.draw( g );
            
            var g2 = outlineGroup.append("g")
                                  .attr("class", "j-outline")
                                  //.on("contextmenu", contextMenu);
                                  .on("click", function( m ) { 
                                    d3.event.preventDefault();
                                    focusDrawingObject(d,true);                            
                                  });

            d.draw( g2, true );
            d.outlineSvg = g2;
            
        }
    });

    var zoomed = function() {
        transformGroup1.attr("transform", d3.event.transform);

        var currentScale = d3.zoomTransform( transformGroup1.node() ).k; //do we want to scale 1-10 to 1-5 for fonts and linewidths and dots?
        if (   ( currentScale > (1.1*fontsSizedForScale) )
            || ( currentScale < (0.9*fontsSizedForScale) )
            || ( currentScale == 1 ) || ( currentScale == 8 ) )
        {
            if ( ! fontResizeTimer )
            {
                fontResizeTimer = setTimeout(function () {      
                    fontResizeTimer = null;          
                    fontsSizedForScale = d3.zoomTransform( transformGroup1.node() ).k;
                    //console.log( "Resize for " + fontsSizedForScale);

                    for( var i=0; i< patternPiece1.drawingObjects.length; i++ )
                    {
                        var a = patternPiece1.drawingObjects[i];
                        var g = a.drawingSvg;
                        
                        g.selectAll( "text" )
                         .attr("font-size", Math.round(1000 / scale / fontsSizedForScale)/100 + "px");

                        g.selectAll( "circle" )
                         .attr("r", Math.round(400 / scale / fontsSizedForScale)/100 );

                        {
                            var strokeWidth = a.getStrokeWidth( false, (selectedObject==a) );

                            g.selectAll( "line" )
                                .attr( "stroke-width", strokeWidth );

                            g.selectAll( "path" )
                                .attr( "stroke-width", strokeWidth );       
                        }

                        g = a.outlineSvg;
                        if ( g )
                        {
                            var strokeWidth = a.getStrokeWidth( true );

                            g.selectAll( "line" )
                             .attr( "stroke-width", strokeWidth );

                            g.selectAll( "path" )
                             .attr( "stroke-width", strokeWidth );       

                            g.selectAll( "circle" )
                                .attr("r", Math.round( 1200 / scale / fontsSizedForScale )/100 );
                        }
                    }        

                }, 50);         
            }   
        }
    };           

    if ( editorOptions.allowPanAndZoom )
    {
        svg.call(d3.zoom()
            .extent([[0, 0], [width, height]])
            .scaleExtent([1, 8])
            .on("zoom", zoomed));
    }

    fontsSizedForScale = 1; //the starting scale of transformGroup1.
}


function doTable( graphdiv, patternPiece1, editorOptions, contextMenu, focusDrawingObject )
{
    var layoutConfig = editorOptions.layoutConfig;
    var margin = layoutConfig.tableMargin;//25; 
    var width =  layoutConfig.tableWidth;//400;
    var height = layoutConfig.tableHeight;//600;
    var minItemHeight = 30; //should not be required
    var itemMargin = 8;
    var itemWidth = width *3/4;
    var ypos = 0;
    var seq = 1; //TODO get these in the XML as data?
    var asFormula = editorOptions.showFormulas; 

    var onclick = function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,false);
    }

    graphdiv.select("div.pattern-table").remove();

    var svg = graphdiv.append("div")
                      .attr("class", "pattern-table")
                      .style( "height", height +"px" )    
                      .append("svg")
                      .attr("width", width + ( 2 * margin ) )
                      .attr("height", minItemHeight * patternPiece1.drawingObjects.length );    

    var a = svg.selectAll("g");
    a = a.data( patternPiece1.drawingObjects );
    a.enter()        
     .append("g")
     .each( function(d,i) {

        var divHeight = function(that) {

            //this - the dom svg element
            //that - the data object

            //console.log( "divHeight() of this:" + this + " that:" + that );

            //var div = $(this).find( "div.nodedesc" );
            var h = $(this).find( "div.outer" ).height();
            
            if ( h < minItemHeight )
                return minItemHeight;
            return h;
            
        };

        var g = d3.select( this );

        g.attr( "class", "j-item") ;

        if ( d.error )
            g.attr( "class", "j-item error") ;

        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * minItemHeight );

        var fo = g.append( "foreignObject" )
         .attr( "x", 0 )
         .attr( "y", function (d) { 
             return ypos;
         } )
         .attr( "width", itemWidth  );

         var html;
         try {
            html = d.html( asFormula );
            if (d.error)
                html += '<div class="error">' + d.error + '</div>';
         } catch ( e ) {
             html = "Failed to generate description.";
         }

         var div = fo.append( "xhtml:div" )
           .attr("class","outer")
           .append( "xhtml:div" )
           .attr("class","desc")
           .html( html );

        fo.attr( "height", 1 ); //required by firefox otherwise bounding rects returns nonsense
        fo.attr( "height", divHeight );

        g.attr( "height", divHeight )
         .attr( "y", function (d) { 
                                    //Get the height of the foreignObject.
                                    var h = this.childNodes[0].getBoundingClientRect().height;
                                    ypos += h + itemMargin; 
                                    //console.log("y: " + ypos );
                                    return ypos } )

        g.on("contextmenu", contextMenu)
         .on("click", onclick );
    });                   
    
    svg.attr("height", ypos );    

    linksGroup = svg.append("g")
                    .attr("class", "links");

    //Links area is width/4 by ypos.            
    var linkScale = (width/4) / Math.log( Math.abs( ypos /30 ) );   
    drawLinks( patternPiece1, linkScale );
}


function drawLinks( patternPiece, linkScale )
{
    var linkData = patternPiece.dependencies.dependencies;

    linksGroup.selectAll("path.link") //rename .link to .dependency
                    .data(linkData)
                    .enter().append("path")
                    .attr("class", "link" )
                    .attr("d", function( link ) {
                        var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
                            x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;
                    
                        var dx = x0 - x1,
                            dy = y0 - y1,
                            l = Math.log( Math.abs(dy /30 ) ) * linkScale;
                    
                        var path = d3.path();
                        path.moveTo( x0, y0 );
                        path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
                        return path;                      
                    } );
                    //.attr("d", curve);
}


/*
 * Curve that connects items in the table.
 */
function curve(link) {
    var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
        x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;

    var dx = x0 - x1,
        dy = y0 - y1,
        l = Math.log( Math.abs(dy /30 ) ) * 50;

    var path = d3.path();
    path.moveTo( x0, y0 );
    path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
    return path;                      
}


export{ PatternPiece, doDrawing, doTable, drawPattern  };
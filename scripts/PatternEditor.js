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
        if (    ( d3.event) 
             && ( d3.event.originalTarget )
             && ( d3.event.originalTarget.className === "ps-ref" )
             && ( selectedObject == d )
             )
        {
            selectedObject = d.patternPiece.getObject( d3.event.originalTarget.innerHTML );
            scrollTable = true;
        }
        else
        {
            selectedObject = d;
        }

        for( var j=0; j< pattern.patternPieces.length; j++ )
            for( var i=0; i< pattern.patternPieces[j].drawingObjects.length; i++ )
            {
                var a = pattern.patternPieces[j].drawingObjects[i];
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

                    if ( d.target.outlineSvg ) //if it errored this will be undefined
                        d.target.outlineSvg.node().classList.add("source");

                    //d.target.tableSvg.each( function() { $(this).addClass("source"); } );
                    return "source link";
                }
                if ( d.target == selectedObject ) 
                {
                    d.source.tableSvg.node().classList.add("target");

                    if ( d.source.outlineSvg ) //if it errored this will be undefined
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
                                        doDrawing( targetdiv, pattern, dataAndConfig.options, contextMenu, focusDrawingObject );
                                    else
                                        targetdiv.select("svg.pattern-drawing").remove();

                                    if ( dataAndConfig.options.layoutConfig.tableWidth )
                                        doTable( targetdiv, pattern, dataAndConfig.options, contextMenu, focusDrawingObject );
                                    else
                                        targetdiv.select("div.pattern-table").remove();
                                };

    doControls( targetdiv, dataAndConfig.options, pattern, doDrawingAndTable );
    doDrawingAndTable();                   
    
    var errorFound = false;
    for( var j=0; j< pattern.patternPieces.length; j++ )
    {
        for( var i=0; i< pattern.patternPieces[j].drawingObjects.length; i++ )
        {
            var a = pattern.patternPieces[j].drawingObjects[i];
            if ( a.error )
            {
                focusDrawingObject(a, true);
                errorFound = true;
                break;
            }
        }
        if ( errorFound )
            break;
    }

}


function doControls( graphdiv, editorOptions, pattern, doDrawingAndTable )
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
                                     .html( '<i class="icon-fullscreen" />' )
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

    if ( pattern.wallpapers )
    {
        var wallpaperControlsGroups = controls.append("table").attr("class","wallpapers");
        wallpaperControlsGroups.selectAll("tr")
            .data( pattern.wallpapers )
            .enter()
            .append("tr")
            .attr( "class", function(w) { return w.hide ? 'wallpaper-hidden' : null; } )
            .each( function(wallpaper,i){
                console.log("here");
                var wallpaperDiv = d3.select(this);
                wallpaperDiv.append( "td" ).html( function(w) { return w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' } )
                                           .on("click", function(w) { w.hide = ! w.hide; 
                                                                      d3.select(this).html( w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' );
                                                                      d3.select(this.parentNode).attr( "class", w.hide ? 'wallpaper-hidden' : null );
                                                                      var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                      doWallpapers( wallpaperGroups, pattern );                                                              
                                                                     } );
                wallpaperDiv.append( "td" ).html( function(w) { return w.editable ? '<i class="icon-unlock"/>' : '<i class="icon-lock"/>' } )
                                           .on("click", function(w) { w.editable = ! w.editable; 
                                                                      d3.select(this).html( w.editable ? '<i class="icon-unlock"/>' : '<i class="icon-lock"/>' );
                                                                      var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                      doWallpapers( wallpaperGroups, pattern );                                                              
                                                                     } );
                wallpaperDiv.append( "td" ).text( wallpaper.filename ? wallpaper.filename : wallpaper.imageurl );
                                                                     //icon-lock icon-unlock icon-move icon-eye-open icon-eye-close
            });
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
function doDrawing( graphdiv, pattern, editorOptions, contextMenu, focusDrawingObject )
{
    var layoutConfig = editorOptions.layoutConfig;
    var margin = layoutConfig.drawingMargin;//25;    ///XXX why a margin at all?
    var width =  layoutConfig.drawingWidth;
    var height = layoutConfig.drawingHeight;
    var patternPiece1 = pattern.patternPieces[0];

    graphdiv.select("svg.pattern-drawing").remove();

    var svg = graphdiv.append("svg")
                       .attr("class", "pattern-drawing" )
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

    var transformGroup1 = svg.append("g")
                            .attr("transform", "translate(" + ( margin ) + "," + ( margin ) + ")");

    var patternWidth = ( patternPiece1.bounds.maxX - patternPiece1.bounds.minX );
    var patternHeight =( patternPiece1.bounds.maxY - patternPiece1.bounds.minY );

    var scaleX = width / patternWidth;                   
    var scaleY = height / patternHeight;           
    
    if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
        scale = scaleX > scaleY ? scaleY : scaleX;
    else if ( isFinite( scaleX ) )
        scale = scaleX;
    else
        scale = 1;

    //console.log( "scale:" + scale + " patternWidth:" + patternWidth + " width:" + width );

    //transformGroup2 scales from calculated positions in pattern-space (e.g. 10 representing 10cm) to
    //pixels available. So 10cm in a 500px drawing has a scale of 50. 
    var transformGroup2 = transformGroup1.append("g")
        .attr("transform", "scale(" + scale + "," + scale + ")");

    //centralise horizontally                            
    var boundsWidth = patternPiece1.bounds.maxX - patternPiece1.bounds.minX;
    var availableWidth = width / scale;
    var offSetX = ( availableWidth - boundsWidth ) /2;

    //transformGroup3 shifts the position of the pattern, so that it is centered in the available space. 
    var transformGroup3 = transformGroup2.append("g")
                               .attr("class","pattern")
                               .attr("transform", "translate(" + ( ( -1.0 * ( patternPiece1.bounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * patternPiece1.bounds.minY ) ) + ")");    

    if ( pattern.wallpapers )
    {
        var wallpaperGroups = transformGroup2.append("g")
                                             .attr("class","wallpapers")
                                             .attr("transform", "translate(" + ( ( -1.0 * ( patternPiece1.bounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * patternPiece1.bounds.minY ) ) + ")")   
                                             .lower();
        doWallpapers( wallpaperGroups, pattern );
    }
     
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
                         .attr("font-size", Math.round(1200 / scale / fontsSizedForScale)/100 + "px");

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
            .scaleExtent([0.5, 8])
            .on("zoom", zoomed));
    }

    fontsSizedForScale = 1; //the starting scale of transformGroup1.
}


function doWallpapers( wallpaperGroups, pattern )
{
    var visibleWallpapers = [];
    for( var i=0; i<pattern.wallpapers.length; i++ )
    {
        var w = pattern.wallpapers[i];
        if ( ! w.scaleAdjusted )
        {
            //A 720px image is naturally 10in (at 72dpi)
            //If our pattern as 10in across then our image should be 10 units.
            //If our pattern was 10cm across then our image should be 25.4 units and we would expect to need to specify a scale of 1/2.54
            if ( pattern.units === "cm" )
            {
                w.scaleX = w.scaleX * 2.54;
                w.scaleY = w.scaleY * 2.54;
            }
            else if ( pattern.units === "mm" )
            {
                w.scaleX = w.scaleX * 25.4;
                w.scaleY = w.scaleY * 25.4;
            }
            w.scaleX = w.scaleX / 72 /*dpi*/; //And adjust by pattern.units
            w.scaleY = w.scaleY / 72 /*dpi*/;
            w.scaleAdjusted = true;
        }

        if ( w.hide )
            continue;

        visibleWallpapers.push( w );
    }

    var drag = d3.drag()
        .on("start", function(wallpaper) {
            //var wallpaperG = d3.select(this);
            //if ( ! wallpaper.editable )
            //    return;
            wallpaper.offsetXdragStart = wallpaper.offsetX - d3.event.x;
            wallpaper.offsetYdragStart = wallpaper.offsetY - d3.event.y;
        })
        .on("drag", function(wallpaper) {
            //if ( ! wallpaper.editable )
            //    return;
            var wallpaperG = d3.select(this);        
            wallpaper.offsetX = wallpaper.offsetXdragStart + d3.event.x;
            wallpaper.offsetY = wallpaper.offsetYdragStart + d3.event.y;
            wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
        });


    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers )
                    //.filter(function(w){return !w.hide;})
                    .enter()
                    .append("g")
                    .attr( "class", function(w){ return w.editable ? "wallpaper editable" : "wallpaper" } )
                    .attr("transform", function(wallpaper) { return  "translate(" + ( wallpaper.offsetX ) + "," + ( wallpaper.offsetY ) + ")"
                                                                    + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + ")" } )
                    .append( "image" )
                    //.attr( "width", function(w) { return w.width } )   //does this do anything?
                    //.attr( "height", function(w) { return w.height } )
                    .attr( "href", function(w) { return w.imageurl } )
                    .attr( "opacity", function(w) { return w.opacity } );

    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers )
                    .exit().remove();

    //Add a resizing boundary to each editable wallpaper.                 
    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers )
                    //.filter(function(w){return !w.hide;})
                    .each( function(w,i) {
                        var g = d3.select(this);
                        var box = g.node().getBBox();
                        w.width = box.width;
                        w.height = box.height;

                        if ( w.editable )
                        {
                            g.append("rect")
                            .attr("x",0)
                            .attr("y",0)
                            .attr("stroke", "red")
                            .attr("fill", "none")
                            .attr("width", w.width)
                            .attr("height", w.height);
    
                            g.append( "circle") 
                            .attr("cx", function(w) { return w.width } )
                            .attr("cy", function(w) { return w.height } )
                            .attr("r", 10 / scale / w.scaleX / fontsSizedForScale )
                            .attr("fill", "red");
                            
                            g.call(drag);
                        }
                        else
                        {
                            g.select("rect").remove();
                            g.select("circle").remove();
                            g.on(".drag", null );
                        }
                     } );
        
    var resize = d3.drag()
        .on("start", function(wallpaper) {
            wallpaper.offsetXdragStart = d3.event.x - wallpaper.width;
            wallpaper.offsetYdragStart = d3.event.y - wallpaper.height;
            //console.log("start offsetXdragStart:" + wallpaper.offsetXdragStart );
        })
        .on("end", function(wallpaper) {
            var wallpaperG = d3.select(this.parentNode);
            var circle = d3.select(this);
            var rect = wallpaperG.select("rect");
            var ratio = circle.attr("cx") / wallpaper.width;     
            var scaleXbefore = wallpaper.scaleX;                   
            wallpaper.scaleX = wallpaper.scaleX * ratio; //fixed aspect?
            wallpaper.scaleY = wallpaper.scaleY * ratio;
            //console.log( "cx:" + circle.attr("cx") + " image:" + wallpaper.width + "  ratio:" + ratio + "  scaleXbefore:" + scaleXbefore + "  scaleXNow:" + wallpaper.scaleX );
            wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
            circle.attr("cx", wallpaper.width )
                    .attr("cy", wallpaper.height );
            rect.attr("width", wallpaper.width )
                .attr("height", wallpaper.height );
        } )
        .on("drag", function(wallpaper) {
            var wallpaperG = d3.select(this.parentNode);
            var circle = d3.select(this);
            var rect = wallpaperG.select("rect");
            var newX = d3.event.x - wallpaper.offsetXdragStart;
            var newY = d3.event.y - wallpaper.offsetYdragStart;
            //console.log("drag d3.event.x:" + d3.event.x + "  newX:" + newX );
            if ( true ) //fixed aspect
            {
                var ratioX = newX / wallpaper.width;
                var ratioY = newY / wallpaper.height;
                var ratio = (ratioX+ratioY)/2.0;
                newX = ratio * wallpaper.width;
                newY = ratio * wallpaper.height;
            }
            circle.attr("cx", newX )
                    .attr("cy", newY );
            rect.attr("width", newX )
                .attr("height", newY );
        });

    resize(wallpaperGroups.selectAll("g > circle"));            
}


function doTable( graphdiv, pattern, editorOptions, contextMenu, focusDrawingObject )
{
    var patternPiece1 = pattern.patternPieces[0];
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
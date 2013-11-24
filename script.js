/**
 * The Load Template Wizard
 * 
 * Largely inspired from The Link Wizard (was there a better way to subclass?)
 *
 * @author Cilyan Olowen <gaknar@gmail.com>
 * @author Andreas Gohr <gohr@cosmocode.de>
 * @author Pierre Spring <pierre.spring@caillou.ch>
 */
var dwp_tplwiz = {
    $wiz: null,
    $entry: null,
    result: null,
    timer: null,
    textArea: null,
    selected: null,
    selection: null,

    /**
     * Initialize the dwp_tplwiz by creating the needed HTML
     * and attaching the eventhandlers
     */
    init: function($editor){
        // position relative to the text area
        var pos = $editor.position();

        // create HTML Structure
        if(dwp_tplwiz.$wiz)
            return;
        dwp_tplwiz.$wiz = jQuery(document.createElement('div'))
               .dialog({
                   autoOpen: false,
                   draggable: true,
                   title: LANG.tpll_title,
                   resizable: false
               })
               .html(
                    '<div>Insert: <input type="text" class="edit" id="tpl__wiz_entry" autocomplete="off" /></div>'+
                    '<div id="tpl__wiz_result"></div>'
                    )
               .parent()
               .attr('id','tpl__wiz')
               .css({
                    'position':    'absolute',
                    'top':         (pos.top+20)+'px',
                    'left':        (pos.left+80)+'px'
                   })
               .hide()
               .appendTo('.dokuwiki:first');

        dwp_tplwiz.textArea = $editor[0];
        dwp_tplwiz.result = jQuery('#tpl__wiz_result')[0];

        // scrollview correction on arrow up/down gets easier
        jQuery(dwp_tplwiz.result).css('position', 'relative');

        dwp_tplwiz.$entry = jQuery('#tpl__wiz_entry');
        if(JSINFO.tpll_ns){
            dwp_tplwiz.$entry.val(JSINFO.tpll_ns+':');
        }

        // attach event handlers
        jQuery('#tpl__wiz .ui-dialog-titlebar-close').click(dwp_tplwiz.hide);
        dwp_tplwiz.$entry.keyup(dwp_tplwiz.onEntry);
        jQuery(dwp_tplwiz.result).delegate('a', 'click', dwp_tplwiz.onResultClick);
    },

    /**
     * handle all keyup events in the entry field
     */
    onEntry: function(e){
        if(e.keyCode == 37 || e.keyCode == 39){ //left/right
            return true; //ignore
        }
        if(e.keyCode == 27){ //Escape
            dwp_tplwiz.hide();
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if(e.keyCode == 38){ //Up
            dwp_tplwiz.select(dwp_tplwiz.selected -1);
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if(e.keyCode == 40){ //Down
            dwp_tplwiz.select(dwp_tplwiz.selected +1);
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if(e.keyCode == 13){ //Enter
            if(dwp_tplwiz.selected > -1){
                var $obj = dwp_tplwiz.$getResult(dwp_tplwiz.selected);
                if($obj.length > 0){
                    dwp_tplwiz.resultClick($obj.find('a')[0]);
                }
            }else if(dwp_tplwiz.$entry.val()){
                dwp_tplwiz.insertTemplate(dwp_tplwiz.$entry.val());
            }

            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        dwp_tplwiz.autocomplete();
    },

    /**
     * Get one of the results by index
     *
     * @param   num int result div to return
     * @returns DOMObject or null
     */
    getResult: function(num){
        DEPRECATED('use dwp_tplwiz.$getResult()[0] instead');
        return dwp_tplwiz.$getResult()[0] || null;
    },

    /**
     * Get one of the results by index
     *
     * @param   num int result div to return
     * @returns jQuery object
     */
    $getResult: function(num) {
        return jQuery(dwp_tplwiz.result).find('div').eq(num);
    },

    /**
     * Select the given result
     */
    select: function(num){
        if(num < 0){
            dwp_tplwiz.deselect();
            return;
        }

        var $obj = dwp_tplwiz.$getResult(num);
        if ($obj.length === 0) {
            return;
        }

        dwp_tplwiz.deselect();
        $obj.addClass('selected');

        // make sure the item is viewable in the scroll view

        //getting child position within the parent
        var childPos = $obj.position().top;
        //getting difference between the childs top and parents viewable area
        var yDiff = childPos + $obj.outerHeight() - jQuery(dwp_tplwiz.result).innerHeight();

        if (childPos < 0) {
            //if childPos is above viewable area (that's why it goes negative)
            jQuery(dwp_tplwiz.result)[0].scrollTop += childPos;
        } else if(yDiff > 0) {
            // if difference between childs top and parents viewable area is
            // greater than the height of a childDiv
            jQuery(dwp_tplwiz.result)[0].scrollTop += yDiff;
        }

        dwp_tplwiz.selected = num;
    },

    /**
     * deselect a result if any is selected
     */
    deselect: function(){
        if(dwp_tplwiz.selected > -1){
            dwp_tplwiz.$getResult(dwp_tplwiz.selected).removeClass('selected');
        }
        dwp_tplwiz.selected = -1;
    },

    /**
     * Handle clicks in the result set an dispatch them to
     * resultClick()
     */
    onResultClick: function(e){
        if(!jQuery(this).is('a')) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        dwp_tplwiz.resultClick(this);
        return false;
    },

    /**
     * Handles the "click" on a given result anchor
     */
    resultClick: function(a){
        dwp_tplwiz.$entry.val(a.title);
        if(a.title == '' || a.title.substr(a.title.length-1) == ':'){
            dwp_tplwiz.autocomplete_exec();
        }else{
            if (jQuery(a.nextSibling).is('span')) {
                dwp_tplwiz.insertTemplate(a.nextSibling.innerHTML);
            }else{
                dwp_tplwiz.insertTemplate('');
            }
        }
    },

    /**
     * Insert the id currently in the entry box to the textarea,
     * replacing the current selection or at the cursor position.
     * When no selection is available the given title will be used
     * as link title instead
     */
    insertTemplate: function(title){
        var link = dwp_tplwiz.$entry.val(),
            sel, stxt;
        if(!link) {
            return;
        }
        
        sel = getSelection(dwp_tplwiz.textArea);
        if(sel.start == 0 && sel.end == 0) {
            sel = dwp_tplwiz.selection;
        }
        
        stxt = sel.getText();
        
        // Get the template through AJAX call and insert it into editor
        jQuery.post(
            DOKU_BASE + 'lib/exe/ajax.php',
            {
                call: 'loadtemplate',
                q: dwp_tplwiz.$entry.val(),
                selection: stxt
            },
            function (data) {
                pasteText(sel,data,{startofs: 0, endofs: 0, nosel:true});
                dwp_tplwiz.hide();
            }
        ).fail(function () {
            alert(LANG.tpll_ajaxerror);
        });
        
        // reset the entry to the parent namespace
        dwp_tplwiz.$entry.val(dwp_tplwiz.$entry.val().replace(/[^:]*$/, ''));
    },

    /**
     * Start the page/namespace lookup timer
     *
     * Calls autocomplete_exec when the timer runs out
     */
    autocomplete: function(){
        if(dwp_tplwiz.timer !== null){
            window.clearTimeout(dwp_tplwiz.timer);
            dwp_tplwiz.timer = null;
        }

        dwp_tplwiz.timer = window.setTimeout(dwp_tplwiz.autocomplete_exec,350);
    },

    /**
     * Executes the AJAX call for the page/namespace lookup
     */
    autocomplete_exec: function(){
        var $res = jQuery(dwp_tplwiz.result);
        dwp_tplwiz.deselect();
        $res.html('<img src="'+DOKU_BASE+'lib/images/throbber.gif" alt="" width="16" height="16" />')
            .load(
            DOKU_BASE + 'lib/exe/ajax.php',
            {
                call: 'linkwiz',
                q: dwp_tplwiz.$entry.val()
            }
        );
    },

    /**
     * Show the link wizard
     */
    show: function(){
        dwp_tplwiz.selection  = getSelection(dwp_tplwiz.textArea);
        dwp_tplwiz.$wiz.show();
        dwp_tplwiz.$entry.focus();
        dwp_tplwiz.autocomplete();
    },

    /**
     * Hide the link wizard
     */
    hide: function(){
        dwp_tplwiz.$wiz.hide();
        dwp_tplwiz.textArea.focus();
    },

    /**
     * Toggle the link wizard
     */
    toggle: function(){
        if(dwp_tplwiz.$wiz.css('display') == 'none'){
            dwp_tplwiz.show();
        }else{
            dwp_tplwiz.hide();
        }
    }
};

/**
 * Add button action for the tpl wizard button
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @return boolean    If button should be appended
 * @author Andreas Gohr <gohr@cosmocode.de>
 */
function addBtnActionTplwiz($btn, props, edid) {
    dwp_tplwiz.init(jQuery('#'+edid));
    jQuery($btn).click(function(){
        dwp_tplwiz.val = props;
        dwp_tplwiz.toggle();
        return '';
    });
    return 'tpl__wiz';
}

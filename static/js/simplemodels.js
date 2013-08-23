/*global jQuery Model _ $*/

"use strict";

jQuery.fn.CType = function(typeGroup, params) {
    return new CType(this[0], typeGroup, params);
};

var CTypeGroup = Model.extend({
    constructor : function () {
	this.types = [];
    },
    addType : function (ctype) {
	this.types.push(ctype);
    },
    showType : function (ctype) {
	ctype = ctype || this.types[0];
	_.each(this.types, function (t) {
	    if (t === ctype) {
		t.show();
	    } else {
		t.hide();
	    }
	});
    },
    serialize : function () {
	var all_module_responses = [];
	for (var i = 0; i < this.types.length; i++) {
	    all_module_responses.push(this.types[i].serialize());
	}
	return all_module_responses;
    },
    validate : function () {
	for (var i = 0; i < this.types.length; i++) {
	    if (!this.types[i].validate()) {
		this.showType(this.types[i]);
		return false;
	    }
	}
	return true;
    }
});

var CType = Model.extend({
    constructor : function(el, typeGroup, params) {
	params = params || {};
	this.el = $(el);
	this.typeGroup = typeGroup;
	typeGroup.addType(this);
	this.display_template = $('#ctype-display-template').html();
	this.name = params.name || '';
	this.header = params.header || '';
	this.questionlist = new QuestionList(params.questions || []);
	this.el.empty();
    },
    renderDisplay : function() {
	var self = this;
	var sub_disp = $(document.createElement('div'));
	sub_disp.html(self.display_template);
	this.el_display_props = sub_disp.find('[data-prop]');
	this.question_container = sub_disp.find('.question-display-container:first');
	this.questionlist.renderDisplay(this.question_container);
	this.el.append(sub_disp);
	this.hide(true); // updatesdisplay, too
	this.el.find(".ctype-when-hidden").on("click", function () {
	    self.typeGroup.showType(self);
	});
	this.el.find("form").on("change", function () {
	    $(".question-invalid").removeClass("question-invalid");
	});
    },
    objectifyDisplay : function() {
	return {
	    name : this.name,
	    header : this.header,
	    numQuestions : this.questionlist.numQuestions(),
	    numCompleted : this.questionlist.numCompleted()
	};
    },
    serialize : function() {
	return {
	    name : this.name,
	    responses : this.questionlist.serialize()
	};	    
    },
    hide : function (fast) {
	if (fast) {
	    this.el.find(".ctype-when-visible").hide()
	} else {
	    this.el.find(".ctype-when-visible").slideUp();
	}
	this.el.find(".ctype-when-hidden").show();
	this.updateDisplay();
    },
    show : function () {
	this.el.find(".ctype-when-visible").slideDown();
	this.el.find(".ctype-when-hidden").hide();
	this.updateDisplay();
    },
    validate : function () {
	return this.questionlist.validate();
    }
});


var QuestionList = Model.extend({
    constructor : function(questions) {
	this.questions = questions || [];
	this.display_template = $('#questionlist-display-template').html();
	this.renderedquestions = [];
	this.holders = [];
    },
    renderDisplay : function(el) {
        this.el = $(el);
	this.el.empty();
	for (var i = 0; i < this.questions.length; i++) {
	    var question_holder = $(document.createElement('li'));	    
	    var question = new Question(question_holder, this.questions[i]);
	    question.renderDisplay();
	    this.el.append(question_holder);
	    this.holders.push(question_holder);
	    this.renderedquestions.push(question);
	}	
    },
    serialize : function() {
	var all_question_responses = [];
	for (var i = 0; i < this.renderedquestions.length; i++) {
	    all_question_responses.push(this.renderedquestions[i].serialize());
	}
	return all_question_responses;
    },
    numQuestions : function () {
	return this.renderedquestions.length;
    },
    numCompleted : function () {
	var c = 0;
	for (var i = 0; i < this.renderedquestions.length; i++) {
	    if (this.renderedquestions[i].validate()) {
		c += 1;
	    }
	}
	return c;
    },
    validate : function () {
	for (var i = 0; i < this.renderedquestions.length; i++) {
	    if (!this.renderedquestions[i].validate()) {
		this.holders[i].addClass("question-invalid");
		return false;
	    }
	}
	return true;
    }
});

var Question = Model.extend({
    constructor : function(el, question) {
	switch (question.valuetype) {
	    case 'numeric':
                return new NumericQuestion(el, question);
	    case 'categorical':
	    	 return new CategoricalQuestion(el, question);
            default:
		throw "Error: could not find type "+question.valuetype;
	}	
    },
    serialize : function() {
	return { 
	    varname : this.varname,
	    response : this.response()
	};
    },
    serializeForDisplay : function() {
	return {
	    questiontext : this.questiontext,
	    valuetype : this.valuetype,
	    varname : this.varname,
	    content : this.content
	}
    },
    validate : function () {
	if (this.response() === undefined) {
	    return false;
	} else {
	    return true;
	}
    }
});

var NumericQuestion = Question.extend({
    constructor : function(el, question) {
        this.el = $(el);
	this.display_template = $('#numericquestion-display-template').html();
	this.valuetype = question.valuetype;
	this.questiontext = question.questiontext;
	this.varname = question.varname;
	this.content = question.content;
    },
    renderDisplay : function() {
        this.el.empty();
        this.el.html(_.template(this.display_template, this.serializeForDisplay()));
    },
    response : function() {
	return this.el.find('input:first').val();
    }
});

var CategoricalQuestion = Question.extend({
    constructor : function(el, question) {
        this.el = $(el);
	this.display_template = $('#catquestion-display-template').html();
	this.display_template_sideways = $('#catquestionsideways-display-template').html();
	this.valuetype = question.valuetype;
	this.questiontext = question.questiontext;
	this.varname = question.varname;
	this.content = question.content;
    },
    shouldBeSideways : function () {
	return (this.content.length >=5
		&& _.all(this.content, function (choice) { return choice.text.length <= 2; }));
    },
    renderDisplay : function() {
        this.el.empty();
	var t = this.shouldBeSideways() ? this.display_template_sideways : this.display_template;
        this.el.html(_.template(t, this.serializeForDisplay()));
    },
    response : function() {
	return this.el.find('input:checked').val();
    } 
});

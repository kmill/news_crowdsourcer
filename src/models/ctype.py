from question import Question

class CType(object) :
    def __init__(self, name=None, header=None, questions=[]) :
        self.name = name
        self.header = header
        self.questions = questions
    @classmethod
    def from_dict(cls, d) :
        return CType(d['name'], d['header'], [Question.deserialize(q) for q in d['questions']])
    def to_dict(self) :
        return {'name' : self.name,
                'header' : self.header,
                'questions' : [q.serialize() for q in self.questions]}
    def filter_bonus_questions(self, response_info={}):
        bonus_questions = {q.varname : q.get_bonus() for q in self.questions if q.bonus}
        filtered_info = {}
        for varname in response_info :
            if varname not in bonus_questions :
                continue
            filtered_info[varname] = response_info[varname]
            filtered_info[varname]['__bonus__'] = bonus_questions[varname]
        return filtered_info
                
    def validate(self, response) :
        """Validates a response for this module as given by JSON from the client."""
        questions = {q.varname : q for q in self.questions}
        valids = set()
        for r in response['responses'] :
            if r.get('varname', None) not in questions :
                return False
            if not questions[r['varname']].validate(r) :
                return False
            valids.add(r['varname'])
        if valids != set(questions.iterkeys()) :
            return False
        return True


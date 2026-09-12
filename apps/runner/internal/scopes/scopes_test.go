package scopes

import "testing"

func TestWriteImpliesRead(t *testing.T) {
	s := NewSet(JobsWrite)
	if !s.Has(JobsRead) || !s.Has(JobsWrite) {
		t.Fatal("write should imply read")
	}
	if s.Has(KeysRead) {
		t.Fatal("unrelated resource granted")
	}
	if NewSet(JobsRead).Has(JobsWrite) {
		t.Fatal("read must not imply write")
	}
}

func TestParseAll(t *testing.T) {
	got, err := ParseAll([]string{"jobs:read", " jobs:read", "keys:write"})
	if err != nil || len(got) != 2 {
		t.Fatalf("got %v, %v", got, err)
	}
	if _, err := ParseAll([]string{"admin:root"}); err == nil {
		t.Fatal("unknown scope accepted")
	}
}

// Package arch enforces the dependency rules of the hexagon the same way
// apps/api's dependency-cruiser does: a test that fails when an import
// crosses a boundary it must not.
//
// Rules, from the inside out:
//   - `<ctx>/domain` imports no other internal package except platform/problem
//     (error catalog entries live next to the aggregate) and scopes.
//   - `<ctx>/app` imports only its own domain, platform/auth, platform/problem
//     and scopes — never an adapter, never another context.
//   - `<ctx>/adapters/*` import their own context's app and domain and the
//     platform — never another context, never the composition root.
//   - `platform/*` never imports a bounded context, config, health or server.
//   - Only `server` (the composition root) and each context's module.go may
//     import concrete adapters.
package arch

import (
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const modulePrefix = "github.com/jordiparracrespo/flama-ai/apps/runner/internal/"

var contexts = []string{"apikeys", "jobs"}

func TestImportBoundaries(t *testing.T) {
	root, err := filepath.Abs("..")
	if err != nil {
		t.Fatal(err)
	}
	var violations []string
	err = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return err
		}
		rel, _ := filepath.Rel(root, path)
		pkg := filepath.ToSlash(filepath.Dir(rel))
		f, err := parser.ParseFile(token.NewFileSet(), path, nil, parser.ImportsOnly)
		if err != nil {
			return err
		}
		for _, imp := range f.Imports {
			target := strings.Trim(imp.Path.Value, `"`)
			if !strings.HasPrefix(target, modulePrefix) {
				continue
			}
			target = strings.TrimPrefix(target, modulePrefix)
			if reason := violates(pkg, target); reason != "" {
				violations = append(violations, rel+" imports "+target+": "+reason)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, v := range violations {
		t.Error(v)
	}
}

func violates(from, to string) string {
	fromCtx, fromLayer := split(from)
	toCtx, _ := split(to)

	switch {
	case strings.HasPrefix(from, "platform/"):
		if strings.HasPrefix(to, "platform/") || to == "scopes" {
			return ""
		}
		return "platform must not depend on contexts or the root"

	case fromLayer == "domain":
		if to == "platform/problem" || to == "scopes" {
			return ""
		}
		return "domain must stay free of infrastructure"

	case fromLayer == "app":
		if toCtx == fromCtx && strings.HasSuffix(to, "/domain") {
			return ""
		}
		if to == "platform/auth" || to == "platform/problem" || to == "scopes" {
			return ""
		}
		return "app may only import its domain, auth, problem and scopes"

	case strings.HasPrefix(fromLayer, "adapters/"):
		if toCtx == fromCtx && !strings.Contains(strings.TrimPrefix(to, fromCtx+"/"), "adapters/") {
			return ""
		}
		if toCtx == fromCtx && strings.HasPrefix(to, fromCtx+"/adapters/ws") && strings.HasPrefix(from, fromCtx+"/adapters/http") {
			// The REST adapter reuses the wire struct so both surfaces match.
			return ""
		}
		if strings.HasPrefix(to, "platform/") || to == "scopes" {
			return ""
		}
		return "adapters may only import their own context and the platform"

	case fromLayer == "" && fromCtx != "" && isContext(fromCtx):
		// module.go: the context's own wiring.
		if toCtx == fromCtx || strings.HasPrefix(to, "platform/") || to == "scopes" {
			return ""
		}
		return "a module wires only its own context"

	case from == "server" || from == "health" || from == "config":
		return ""
	}
	return ""
}

// split turns `jobs/adapters/http` into ("jobs", "adapters/http") and
// `platform/ws` into ("", "").
func split(pkg string) (ctx, layer string) {
	parts := strings.SplitN(pkg, "/", 2)
	if !isContext(parts[0]) {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], parts[1]
}

func isContext(name string) bool {
	for _, c := range contexts {
		if c == name {
			return true
		}
	}
	return false
}

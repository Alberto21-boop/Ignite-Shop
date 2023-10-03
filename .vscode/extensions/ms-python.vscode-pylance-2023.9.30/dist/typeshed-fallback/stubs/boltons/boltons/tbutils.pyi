from collections.abc import Iterator
from types import FrameType, TracebackType
from typing import Any
from typing_extensions import Self

class Callpoint:
    func_name: str
    lineno: int
    module_name: str
    module_path: str
    lasti: int
    line: str
    def __init__(
        self, module_name: str, module_path: str, func_name: str, lineno: int, lasti: int, line: str | None = None
    ) -> None: ...
    def to_dict(self) -> dict[str, object]: ...
    @classmethod
    def from_current(cls, level: int = 1) -> Self: ...
    @classmethod
    def from_frame(cls, frame: FrameType) -> Self: ...
    @classmethod
    def from_tb(cls, tb: TracebackType) -> Self: ...
    def tb_frame_str(self) -> str: ...

class TracebackInfo:
    callpoint_type: type[Callpoint]
    frames: list[FrameType]
    def __init__(self, frames: list[FrameType]) -> None: ...
    @classmethod
    def from_frame(cls, frame: FrameType | None = None, level: int = 1, limit: int | None = None) -> Self: ...
    @classmethod
    def from_traceback(cls, tb: TracebackType | None = None, limit: int | None = None) -> Self: ...
    @classmethod
    def from_dict(cls, d: dict[str, list[FrameType]]) -> Self: ...
    def to_dict(self) -> dict[str, list[FrameType]]: ...
    def __len__(self) -> int: ...
    def __iter__(self) -> Iterator[FrameType]: ...
    def get_formatted(self) -> str: ...

class ExceptionInfo:
    tb_info_type: type[TracebackInfo]
    exc_type: str
    exc_msg: str
    tb_info: TracebackInfo
    def __init__(self, exc_type: str, exc_msg: str, tb_info: TracebackInfo) -> None: ...
    @classmethod
    def from_exc_info(cls, exc_type: str, exc_value: Any, traceback: TracebackType) -> Self: ...
    @classmethod
    def from_current(cls) -> Self: ...
    def to_dict(self) -> dict[str, str | dict[str, list[FrameType]]]: ...
    def get_formatted(self) -> str: ...
    def get_formatted_exception_only(self) -> str: ...

class ContextualCallpoint(Callpoint):
    local_reprs: dict[Any, Any]
    pre_lines: list[str]
    post_lines: list[str]
    def __init__(self, *a, **kw) -> None: ...
    @classmethod
    def from_frame(cls, frame: FrameType) -> Self: ...
    @classmethod
    def from_tb(cls, tb: TracebackType) -> Self: ...
    def to_dict(self) -> dict[str, Any]: ...

class ContextualTracebackInfo(TracebackInfo):
    callpoint_type: type[ContextualCallpoint]

class ContextualExceptionInfo(ExceptionInfo):
    tb_info_type: type[ContextualTracebackInfo]

def print_exception(etype: str, value: Any, tb: TracebackType, limit: int | None = None, file: str | None = None) -> None: ...

class ParsedException:
    exc_type: str
    exc_msg: str
    frames: list[FrameType]
    def __init__(self, exc_type_name: str, exc_msg: str, frames: list[FrameType] | None = None) -> None: ...
    @property
    def source_file(self) -> str | None: ...
    def to_dict(self) -> dict[str, str | list[FrameType]]: ...
    def to_string(self) -> str: ...
    @classmethod
    def from_string(cls, tb_str: str) -> Self: ...

ParsedTB = ParsedException
